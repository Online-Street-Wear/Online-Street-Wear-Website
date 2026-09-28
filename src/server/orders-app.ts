import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { catalog } from '../shared/catalog.ts'
import { MAX_CART_ITEMS, MAX_CART_QUANTITY, MAX_COLOUR_LENGTH, MAX_ORDER_QUANTITY } from '../shared/order-limits.ts'
import { PRODUCT_SIZES } from '../shared/product-options.ts'
import { getShippingFee, SHIPPING_BY_PROVINCE } from '../shared/shipping.ts'
import type { ShippingProvince } from '../shared/shipping.ts'
import type { OrderStatus } from '../shared/orders.ts'
import { OrderStore, publicOrder, adminOrder } from './order-store.ts'
import type { SqlDatabase, StoredOrder } from './order-store.ts'
import { enqueueOrderNotification, retryOrderEmails, sendOrderEmail, sendOrderNotifications } from './order-email.ts'
import type { EmailBindings } from './order-email.ts'

export interface OrderBindings extends EmailBindings {
  DB: SqlDatabase
  PAYSTACK_SECRET_KEY?: string
  PAYSTACK_CURRENCY?: string
  ORDER_ADMIN_TOKEN?: string
  SITE_URL?: string
  FIREBASE_PROJECT_ID?: string
}

// eslint-disable-next-line no-control-regex -- Reject ASCII control characters in customer input.
const line = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Please remove control characters.')
const emailSchema = z.string().trim().email('Enter a valid email address.').max(254).transform(value => value.toLowerCase())
const checkoutSchema = z.object({
  email: emailSchema,
  shippingProvince: z.string().refine(value => Object.hasOwn(SHIPPING_BY_PROVINCE, value), 'Select a delivery province.'),
  shippingAddress: z.object({
    fullName: line(100),
    phone: line(30).transform(value => value.replace(/[\s()-]/g, '')).refine(value => /^(?:0\d{9}|\+27\d{9})$/.test(value), 'Enter a valid South African contact number.'),
    paxiPointCode: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/, 'Enter the PAXI point code for your chosen PEP store.').transform(value => value.toUpperCase()),
    paxiPointName: line(160),
  }),
  items: z.array(z.object({
    productId: line(150),
    size: z.enum(PRODUCT_SIZES, { errorMap: () => ({ message: 'Choose a size (S, M, L, XL or XXL) for every item.' }) }),
    quantity: z.number().int().min(1).max(MAX_CART_QUANTITY, `Choose no more than ${MAX_CART_QUANTITY} of each item.`),
    // eslint-disable-next-line no-control-regex -- Colour requests must also exclude ASCII control characters.
    requestedColour: z.string().trim().max(MAX_COLOUR_LENGTH, `Keep colour requests within ${MAX_COLOUR_LENGTH} characters.`).refine(value => !/[\u0000-\u001f\u007f]/.test(value)).optional(),
  })).min(1).max(MAX_CART_ITEMS, `Your cart can contain up to ${MAX_CART_ITEMS} different items.`)
    .refine(items => items.reduce((sum, item) => sum + item.quantity, 0) <= MAX_ORDER_QUANTITY, `Order up to ${MAX_ORDER_QUANTITY} items at a time. Contact the store for larger orders.`),
  site_url: z.string().url().max(300).optional(),
})
const trackSchema = z.object({ orderNumber: z.string().trim().min(1).max(80).transform(value => value.toUpperCase()), email: emailSchema })
const adminListSchema = z.object({ search: z.string().trim().max(254).default(''), cursor: z.string().max(1024).optional() })
const adminCursorSchema = z.object({ createdAt: z.string().datetime(), orderNumber: line(80), search: z.string().max(254) })
const PAXI_TRACKING_URL = 'https://www.paxi.co.za/track-a-parcel'
const trackingSchema = z.object({ courier: z.literal('PAXI').default('PAXI'), trackingNumber: line(100), url: z.literal(PAXI_TRACKING_URL).optional() }).transform(value => ({ ...value, url: PAXI_TRACKING_URL }))
const updateSchema = z.object({ status: z.enum(['confirmed', 'processing', 'shipped', 'ready_for_collection', 'delivered', 'cancelled']).optional(), tracking: trackingSchema.optional() }).refine(value => value.status || value.tracking, 'Choose an order status or enter tracking details.')

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex')
function safeEqual(a: string, b: string) {
  const first = Buffer.from(a)
  const second = Buffer.from(b)
  return first.length === second.length && timingSafeEqual(first, second)
}

function originForCheckout(requestUrl: string, requested: string | undefined, configured: string | undefined) {
  const req = new URL(requestUrl)
  const isLocal = (url: URL) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const configuredUrl = configured?.trim() ? new URL(configured) : null
  if (configuredUrl && !['https:', 'http:'].includes(configuredUrl.protocol)) throw new HTTPException(503, { message: 'The store website URL is not configured correctly.' })
  if (configuredUrl && configuredUrl.protocol !== 'https:' && !isLocal(configuredUrl)) throw new HTTPException(503, { message: 'The store website URL must use HTTPS.' })
  const requestedUrl = requested ? new URL(requested) : null
  if (configuredUrl) {
    if (requestedUrl && requestedUrl.origin !== configuredUrl.origin) throw new HTTPException(400, { message: 'Checkout must start from the store website.' })
    return configuredUrl.origin
  }
  if (requestedUrl && (requestedUrl.origin === req.origin || (isLocal(req) && isLocal(requestedUrl) && ['http:', 'https:'].includes(requestedUrl.protocol)))) return requestedUrl.origin
  if (requestedUrl) throw new HTTPException(400, { message: 'Checkout must start from the store website.' })
  return isLocal(req) ? 'http://localhost:5173' : req.origin
}

async function readJson(request: Request) {
  try { return await request.json() }
  catch { throw new HTTPException(400, { message: 'Invalid JSON request. Please try again.' }) }
}

const transactionSchema = z.object({ status: z.string(), reference: z.string(), amount: z.number().int().positive(), currency: z.string(), domain: z.enum(['test', 'live']), customer: z.object({ email: z.string().email() }) })
type Transaction = z.infer<typeof transactionSchema>

function assertTransaction(order: StoredOrder, transaction: Transaction) {
  if (transaction.reference !== order.reference || transaction.amount !== order.total || transaction.currency !== order.currency || transaction.domain !== order.paymentMode || transaction.customer.email.trim().toLowerCase() !== order.email) {
    throw new HTTPException(409, { message: 'Payment details do not match this order. Please contact the store with your payment reference.' })
  }
}

async function applyTransaction(store: OrderStore, order: StoredOrder, transaction: Transaction, env: EmailBindings) {
  assertTransaction(order, transaction)
  return store.update(order.orderNumber, latest => {
    if (latest.paymentStatus === 'paid') return false
    if (transaction.status === 'success') {
      latest.paymentStatus = 'paid'
      if (latest.status === 'pending_payment') {
        latest.status = 'confirmed'
        latest.history.push({ status: 'confirmed', at: new Date().toISOString() })
      }
      latest.emailStatus = 'pending'
      enqueueOrderNotification(latest, 'confirmed', env)
    } else {
      const next = transaction.status === 'failed' ? 'failed' : transaction.status === 'abandoned' ? 'abandoned' : 'pending'
      if (next === latest.paymentStatus) return false
      latest.paymentStatus = next
    }
  })
}

export function createOrdersApp(fetcher: typeof fetch = fetch) {
  const app = new Hono<{ Bindings: OrderBindings }>()
  app.use('*', bodyLimit({ maxSize: 64 * 1024, onError: c => c.json({ error: 'Request is too large.' }, 413) }))
  app.use('*', async (c, next) => { c.header('Cache-Control', 'no-store'); c.header('Referrer-Policy', 'no-referrer'); await next() })
  app.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status)
    if (error instanceof z.ZodError) return c.json({ error: error.issues[0]?.message || 'Invalid order details.' }, 400)
    console.error('Order request failed:', error instanceof Error ? error.name : 'UnknownError')
    return c.json({ error: 'Unable to process this order right now. Please try again.' }, 500)
  })

  app.post('/api/newsletter/subscribe', async c => {
    let input: unknown
    try { input = await c.req.json() }
    catch { return c.json({ success: false, message: 'Enter a valid email address and try again.' }, 400) }
    const parsed = z.object({ email: emailSchema }).safeParse(input)
    if (!parsed.success) return c.json({ success: false, message: 'Please enter a valid email address.' }, 400)

    try {
      await c.env.DB.prepare('INSERT INTO newsletter_subscriptions (email) VALUES (?) ON CONFLICT(email) DO NOTHING')
        .bind(parsed.data.email).run()
      // Keep repeat submissions safe without revealing whether an address was already saved.
      return c.json({ success: true, message: 'Thanks! Your email is on the newsletter list.' })
    } catch {
      return c.json({ success: false, message: 'We could not save your subscription. Please try again.' }, 503)
    }
  })

  async function trustedProduct(productId: string, env: OrderBindings) {
    const local = catalog.find(product => product.id === productId)
    if (local) return { id: local.id, name: local.name, unitAmount: Math.round(Number(local.price) * 100) }
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(productId)) throw new HTTPException(400, { message: 'This product is no longer available. Please refresh the shop.' })
    const project = env.FIREBASE_PROJECT_ID?.trim() || 'online-street-wear'
    if (!/^[a-z0-9-]+$/.test(project)) throw new HTTPException(503, { message: 'Product catalog is not configured.' })
    const response = await fetcher(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/products/${encodeURIComponent(productId)}`, { signal: AbortSignal.timeout(8_000) })
    if (response.status === 404 || response.status === 403) throw new HTTPException(400, { message: 'This product is no longer available. Please refresh the shop.' })
    if (!response.ok) throw new HTTPException(502, { message: 'Cannot confirm product availability right now. Please retry.' })
    const document = await response.json() as { fields?: { name?: { stringValue?: string }; price?: { stringValue?: string; integerValue?: string; doubleValue?: number } } }
    const name = document.fields?.name?.stringValue?.trim()
    const price = document.fields?.price
    const amount = Number(price?.stringValue ?? price?.integerValue ?? price?.doubleValue)
    if (!name || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new HTTPException(400, { message: 'This product cannot be ordered right now. Please contact the store.' })
    return { id: productId, name: name.slice(0, 200), unitAmount: Math.round(amount * 100) }
  }

  app.post('/api/payments/create-payment', async c => {
    const body = checkoutSchema.parse(await readJson(c.req.raw))
    const secret = c.env.PAYSTACK_SECRET_KEY?.trim()
    if (!secret) throw new HTTPException(503, { message: 'Paystack secret key is not configured.' })
    if (!/^sk_(test|live)_/.test(secret)) throw new HTTPException(503, { message: 'Configure a valid Paystack secret key on the server.' })
    if (c.env.PAYSTACK_CURRENCY && c.env.PAYSTACK_CURRENCY.trim() !== 'ZAR') throw new HTTPException(503, { message: 'This store currently accepts ZAR payments only.' })
    const siteOrigin = originForCheckout(c.req.url, body.site_url, c.env.SITE_URL)
    const products = await Promise.all([...new Set(body.items.map(item => item.productId))].map(id => trustedProduct(id, c.env)))
    const items = body.items.map(item => {
      const product = products.find(entry => entry.id === item.productId)!
      return { productId: product.id, name: product.name, unitAmount: product.unitAmount, quantity: item.quantity, size: item.size, requestedColour: item.requestedColour || 'As pictured' }
    })
    const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0 || subtotal > 100_000_000) throw new HTTPException(400, { message: 'Please contact the store for an order of this size.' })
    const shippingFee = Math.round(getShippingFee(subtotal / 100, body.shippingProvince as ShippingProvince) * 100)
    const now = new Date().toISOString()
    const orderNumber = `ONL-${now.slice(0, 10).replaceAll('-', '')}-${randomBytes(6).toString('hex').toUpperCase()}`
    const reference = `online-${randomBytes(18).toString('hex')}`
    const trackingToken = randomBytes(32).toString('hex')
    const order: StoredOrder = {
      orderNumber, reference, paymentMode: secret.startsWith('sk_live_') ? 'live' : 'test', tokenHash: hashToken(trackingToken), email: body.email,
      shippingProvince: body.shippingProvince, shippingAddress: body.shippingAddress, siteOrigin,
      status: 'pending_payment', paymentStatus: 'pending', emailStatus: 'pending', emailAttempts: 0,
      items, subtotal, shippingFee, total: subtotal + shippingFee, currency: 'ZAR',
      createdAt: now, updatedAt: now, history: [{ status: 'pending_payment', at: now }],
    }
    const store = new OrderStore(c.env.DB)
    await store.insert(order)
    const callback = new URL('/order-confirmation', siteOrigin)
    callback.searchParams.set('token', trackingToken)
    callback.searchParams.set('reference', reference)
    try {
      const response = await fetcher('https://api.paystack.co/transaction/initialize', {
        method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: String(order.total), email: order.email, currency: order.currency, reference, callback_url: callback.toString(), metadata: { order_number: orderNumber, cancel_action: `${siteOrigin}/cart?canceled=true` } }),
        signal: AbortSignal.timeout(12_000),
      })
      const result = await response.json() as { status?: boolean; data?: { authorization_url?: string; reference?: string } }
      if (!response.ok || result.status !== true || !result.data?.authorization_url || result.data.reference !== reference) throw new Error('Paystack initialization failed')
      const checkoutUrl = new URL(result.data.authorization_url)
      if (checkoutUrl.protocol !== 'https:' || !(checkoutUrl.hostname === 'checkout.paystack.com' || checkoutUrl.hostname.endsWith('.paystack.com') || checkoutUrl.hostname === 'checkout.paystack.co')) throw new Error('Invalid Paystack checkout URL')
      return c.json({ authorization_url: checkoutUrl.toString(), reference, orderNumber, trackingToken })
    } catch {
      // A timeout may happen after Paystack accepted the reference; keep the
      // pending order so a later signed webhook can still reconcile it.
      throw new HTTPException(502, { message: 'Paystack could not open checkout. Your cart is saved; please try again.' })
    }
  })

  async function authorizedOrder(store: OrderStore, reference: string, token: string | undefined) {
    const order = await store.byReference(reference)
    if (!order) throw new HTTPException(404, { message: 'No saved order was found for this payment. If you paid using the earlier checkout, contact the store with your Paystack reference.' })
    if (!token || token.length > 256 || !safeEqual(hashToken(token), order.tokenHash)) throw new HTTPException(403, { message: 'Use the original payment return link, or track your order using its number and your email.' })
    return order
  }

  app.get('/api/payments/verify/:reference', async c => {
    const store = new OrderStore(c.env.DB)
    let order = await authorizedOrder(store, c.req.param('reference'), c.req.query('token'))
    if (order.paymentStatus !== 'paid') {
      const secret = c.env.PAYSTACK_SECRET_KEY?.trim()
      if (!secret) throw new HTTPException(503, { message: 'Payment verification is not configured.' })
      let transaction: Transaction
      try {
        const response = await fetcher(`https://api.paystack.co/transaction/verify/${encodeURIComponent(order.reference)}`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12_000) })
        const result = await response.json() as { status?: boolean; data?: Transaction }
        if (!response.ok || result.status !== true || !result.data) throw new Error('Verification unavailable')
        transaction = transactionSchema.parse(result.data)
      } catch { throw new HTTPException(502, { message: 'We could not confirm payment yet. Please retry verification; do not pay again.' }) }
      order = await applyTransaction(store, order, transaction, c.env)
    }
    if (order.paymentStatus === 'paid') {
      // Each recipient has an independent persisted claim. Send together so
      // verification cannot wait for two consecutive provider timeouts.
      await Promise.all([
        sendOrderEmail(store, order.orderNumber, c.env, fetcher),
        sendOrderNotifications(store, order.orderNumber, c.env, fetcher),
      ])
      order = await store.find(order.orderNumber) || order
    }
    return c.json({ paid: order.paymentStatus === 'paid', paymentStatus: order.paymentStatus, order: publicOrder(order) })
  })

  app.post('/api/payments/webhook', async c => {
    const secret = c.env.PAYSTACK_SECRET_KEY?.trim()
    if (!secret) throw new HTTPException(503, { message: 'Payment verification is not configured.' })
    const raw = await c.req.text()
    const signature = c.req.header('x-paystack-signature') || ''
    const expected = createHmac('sha512', secret).update(raw).digest('hex')
    if (!/^[a-f0-9]{128}$/i.test(signature) || !safeEqual(expected, signature.toLowerCase())) throw new HTTPException(401, { message: 'Invalid webhook signature.' })
    let event: { event: string; data?: unknown }
    try { event = z.object({ event: z.string(), data: z.unknown().optional() }).parse(JSON.parse(raw)) }
    catch { throw new HTTPException(400, { message: 'Invalid webhook payload.' }) }
    if (event.event !== 'charge.success') return c.json({ received: true })
    const transaction = transactionSchema.parse(event.data)
    const store = new OrderStore(c.env.DB)
    const order = await store.byReference(transaction.reference)
    if (!order) return c.json({ received: true, matched: false })
    if (transaction.status !== 'success') throw new HTTPException(400, { message: 'Payment is not successful.' })
    await applyTransaction(store, order, transaction, c.env)
    await Promise.all([
      sendOrderEmail(store, order.orderNumber, c.env, fetcher),
      sendOrderNotifications(store, order.orderNumber, c.env, fetcher),
    ])
    return c.json({ received: true })
  })

  app.post('/api/orders/track', async c => {
    const body = trackSchema.parse(await readJson(c.req.raw))
    const order = await new OrderStore(c.env.DB).find(body.orderNumber)
    if (!order || !safeEqual(hashToken(order.email), hashToken(body.email))) throw new HTTPException(404, { message: 'No order matched that order number and email address.' })
    return c.json({ order: publicOrder(order) })
  })

  app.get('/api/orders/:orderNumber', async c => {
    const order = await new OrderStore(c.env.DB).find(c.req.param('orderNumber').toUpperCase())
    const token = c.req.query('token')
    if (!order || !token || token.length > 256 || !safeEqual(hashToken(token), order.tokenHash)) throw new HTTPException(404, { message: 'Order not found. Use your order number and email to track it.' })
    return c.json({ order: publicOrder(order) })
  })

  app.use('/api/admin/*', async (c, next) => {
    const configured = c.env.ORDER_ADMIN_TOKEN?.trim()
    if (!configured || configured.length < 32) throw new HTTPException(503, { message: 'Order management requires an ORDER_ADMIN_TOKEN of at least 32 characters on the server.' })
    const supplied = c.req.header('authorization') || ''
    if (!safeEqual(hashToken(supplied), hashToken(`Bearer ${configured}`))) throw new HTTPException(401, { message: 'The order management key is incorrect.' })
    await next()
  })

  app.get('/api/admin/orders', async c => {
    const query = adminListSchema.parse(c.req.query())
    const search = query.search.toLowerCase()
    let cursor: z.infer<typeof adminCursorSchema> | undefined
    if (query.cursor) {
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(query.cursor)) throw new Error('Invalid cursor')
        cursor = adminCursorSchema.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')))
        if (cursor.search !== search) throw new Error('Search changed')
      } catch { throw new HTTPException(400, { message: 'This order list page is invalid. Refresh the order search.' }) }
    }
    const page = await new OrderStore(c.env.DB).listPage({ search, cursor })
    return c.json({
      orders: page.orders.map(adminOrder),
      nextCursor: page.nextCursor ? Buffer.from(JSON.stringify({ ...page.nextCursor, search })).toString('base64url') : null,
    })
  })

  app.get('/api/admin/email-settings', c => c.json({
    providerConfigured: Boolean(c.env.RESEND_API_KEY?.trim()),
    senderConfigured: Boolean(c.env.ORDER_FROM_EMAIL?.trim()),
    ownerConfigured: z.string().email().safeParse(c.env.ORDER_OWNER_EMAIL?.trim()).success,
  }))

  app.patch('/api/admin/orders/:orderNumber', async c => {
    const body = updateSchema.parse(await readJson(c.req.raw))
    const store = new OrderStore(c.env.DB)
    const number = c.req.param('orderNumber').toUpperCase()
    if (!await store.find(number)) throw new HTTPException(404, { message: 'Order not found.' })
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      pending_payment: ['cancelled'], confirmed: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['ready_for_collection'], ready_for_collection: ['delivered'], delivered: [], cancelled: [],
    }
    let order = await store.update(number, latest => {
      const next = body.status || latest.status
      if (next !== latest.status && !transitions[latest.status].includes(next)) throw new HTTPException(409, { message: 'This status change is not allowed. Update the order one stage at a time.' })
      if (next !== 'cancelled' && latest.paymentStatus !== 'paid') throw new HTTPException(409, { message: 'Only verified paid orders can be prepared or shipped.' })
      if (body.tracking && !['shipped', 'ready_for_collection', 'delivered'].includes(next)) throw new HTTPException(400, { message: 'Add PAXI tracking when the parcel is handed over.' })
      if (body.tracking) latest.tracking = body.tracking
      if (next === 'shipped' && !latest.tracking) throw new HTTPException(400, { message: 'Enter the courier and tracking number before marking this order shipped.' })
      if (next !== latest.status) {
        latest.status = next
        latest.history.push({ status: next, at: new Date().toISOString() })
        if (next === 'shipped' || next === 'ready_for_collection' || next === 'delivered') {
          enqueueOrderNotification(latest, next, c.env)
        }
      }
    })
    order = await sendOrderNotifications(store, number, c.env, fetcher) || order
    return c.json({ order: adminOrder(order) })
  })

  app.post('/api/admin/orders/retry-emails', async c => c.json(await retryOrderEmails(new OrderStore(c.env.DB), c.env, fetcher)))
  app.post('/api/admin/orders/:orderNumber/retry-email', async c => {
    const store = new OrderStore(c.env.DB)
    const number = c.req.param('orderNumber').toUpperCase()
    if (!await store.find(number)) throw new HTTPException(404, { message: 'Order not found.' })
    await Promise.all([
      sendOrderEmail(store, number, c.env, fetcher),
      sendOrderNotifications(store, number, c.env, fetcher),
    ])
    const order = await store.find(number)
    return c.json({ order: adminOrder(order!) })
  })
  return app
}

export default createOrdersApp()
