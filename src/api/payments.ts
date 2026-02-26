import { Hono } from 'hono'
import crypto from 'crypto'

const PAYFAST_LIVE_PROCESS_URL = 'https://www.payfast.co.za/eng/process'
const PAYFAST_LIVE_VALIDATE_URL = 'https://www.payfast.co.za/eng/query/validate'
const PAYFAST_SANDBOX_VALIDATE_URL = 'https://sandbox.payfast.co.za/eng/query/validate'

type Bindings = {
  DB: D1Database
  PAYFAST_MERCHANT_ID: string
  PAYFAST_MERCHANT_KEY: string
  PAYFAST_PASSPHRASE?: string
  PAYFAST_RETURN_URL?: string
  PAYFAST_CANCEL_URL?: string
  PAYFAST_NOTIFY_URL?: string
  PAYFAST_PROCESS_URL?: string
  PAYFAST_VALIDATE_URL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

const hashSignature = (value: string) =>
  crypto
    .createHash('md5')
    .update(value)
    .digest('hex')

const buildQueryString = (data: Record<string, string>) => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(data)) {
    const normalized = String(value).trim()
    if (normalized.length > 0) {
      params.append(key, normalized)
    }
  }

  return params.toString()
}

const generateSignatureFromData = (data: Record<string, string>, passphrase?: string) => {
  let payload = buildQueryString(data)

  if (passphrase && passphrase.trim().length > 0) {
    payload += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  }

  return hashSignature(payload)
}

const generateSignatureFromItn = (rawBody: string, passphrase?: string) => {
  const sourceParams = new URLSearchParams(rawBody)
  sourceParams.delete('signature')

  const signatureData: Record<string, string> = {}
  for (const [key, value] of sourceParams.entries()) {
    if (value !== '') {
      signatureData[key] = value
    }
  }

  return generateSignatureFromData(signatureData, passphrase)
}

const isSandboxProcessUrl = (processUrl: string) =>
  processUrl.includes('sandbox.payfast.co.za')

const resolveValidateUrl = (processUrl: string, explicitValidateUrl?: string) => {
  if (explicitValidateUrl && explicitValidateUrl.length > 0) {
    return explicitValidateUrl
  }

  return isSandboxProcessUrl(processUrl)
    ? PAYFAST_SANDBOX_VALIDATE_URL
    : PAYFAST_LIVE_VALIDATE_URL
}

const validateWithPayFast = async (validationUrl: string, rawBody: string) => {
  try {
    const response = await fetch(validationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: rawBody,
    })

    if (!response.ok) {
      return false
    }

    const responseText = (await response.text()).trim().toUpperCase()
    return responseText === 'VALID'
  } catch (error) {
    console.error('PayFast ITN validation request failed:', error)
    return false
  }
}

app.post('/create-payment', async (c) => {
  const body = await c.req.json<{
    amount: number | string
    item_name: string
    email: string
    name_first?: string
  }>()

  const { amount, item_name, email } = body

  const merchant_id = c.env.PAYFAST_MERCHANT_ID
  const merchant_key = c.env.PAYFAST_MERCHANT_KEY
  const passphrase = c.env.PAYFAST_PASSPHRASE
  const payment_url = c.env.PAYFAST_PROCESS_URL || PAYFAST_LIVE_PROCESS_URL

  if (!merchant_id || !merchant_key) {
    return c.json({ error: 'PayFast credentials are not configured.' }, 500)
  }

  const amountNumber = Number(amount)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return c.json({ error: 'Invalid amount' }, 400)
  }

  if (!item_name || !email) {
    return c.json({ error: 'Missing item_name or email' }, 400)
  }

  const origin = new URL(c.req.url).origin
  const return_url = c.env.PAYFAST_RETURN_URL || `${origin}/cart?success=true`
  const cancel_url = c.env.PAYFAST_CANCEL_URL || `${origin}/cart?canceled=true`
  const notify_url = c.env.PAYFAST_NOTIFY_URL || `${origin}/api/payments/itn`

  const data: Record<string, string> = {
    merchant_id,
    merchant_key,
    return_url,
    cancel_url,
    notify_url,
    name_first: body.name_first?.trim() || 'Customer',
    email_address: String(email),
    m_payment_id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    amount: amountNumber.toFixed(2),
    item_name: String(item_name),
  }

  const signature = generateSignatureFromData(data, passphrase)

  return c.json({
    payment_url,
    data: {
      ...data,
      signature,
    },
  })
})

app.post('/itn', async (c) => {
  const rawBody = await c.req.text()

  if (!rawBody || rawBody.trim().length === 0) {
    return c.text('Missing ITN payload', 400)
  }

  const params = new URLSearchParams(rawBody)
  const postedSignature = params.get('signature') || ''
  const expectedSignature = generateSignatureFromItn(rawBody, c.env.PAYFAST_PASSPHRASE)
  const signatureValid = postedSignature.length > 0 && postedSignature === expectedSignature

  const merchantId = params.get('merchant_id') || ''
  const merchantValid = merchantId === c.env.PAYFAST_MERCHANT_ID

  const processUrl = c.env.PAYFAST_PROCESS_URL || PAYFAST_LIVE_PROCESS_URL
  const validateUrl = resolveValidateUrl(processUrl, c.env.PAYFAST_VALIDATE_URL)
  const serverValid = await validateWithPayFast(validateUrl, rawBody)

  const isValid = signatureValid && merchantValid && serverValid

  const mPaymentId = params.get('m_payment_id') || ''
  const pfPaymentId = params.get('pf_payment_id') || ''
  const paymentStatus = params.get('payment_status') || 'UNKNOWN'
  const amountGross = params.get('amount_gross') || ''
  const amountFee = params.get('amount_fee') || ''
  const amountNet = params.get('amount_net') || ''
  const itemName = params.get('item_name') || ''
  const emailAddress = params.get('email_address') || ''
  const sourceIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || ''

  try {
    await c.env.DB.prepare(
      `INSERT INTO payfast_itn_events (
        m_payment_id,
        pf_payment_id,
        payment_status,
        amount_gross,
        amount_fee,
        amount_net,
        item_name,
        email_address,
        merchant_id,
        signature,
        signature_valid,
        merchant_valid,
        server_valid,
        is_valid,
        source_ip,
        raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        mPaymentId,
        pfPaymentId,
        paymentStatus,
        amountGross,
        amountFee,
        amountNet,
        itemName,
        emailAddress,
        merchantId,
        postedSignature,
        signatureValid ? 1 : 0,
        merchantValid ? 1 : 0,
        serverValid ? 1 : 0,
        isValid ? 1 : 0,
        sourceIp,
        rawBody
      )
      .run()
  } catch (error) {
    console.error('Failed to store PayFast ITN event:', error)
    return c.text('Failed to persist ITN event', 500)
  }

  if (!isValid) {
    return c.text('Invalid ITN', 400)
  }

  // At this point, ITN has been verified and persisted.
  // Business logic for completed/failed/cancelled statuses can be handled here.
  return c.text('OK', 200)
})

export default app
