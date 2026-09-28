import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { OrderStore } from './order-store.ts'
import type { StoredOrder, StoredOrderNotification } from './order-store.ts'
import type { OrderNotificationKind } from '../shared/orders.ts'

export interface EmailBindings { RESEND_API_KEY?: string; ORDER_FROM_EMAIL?: string; ORDER_OWNER_EMAIL?: string }

const retryWindow = 23 * 60 * 60 * 1000

function ownerRecipient(env: EmailBindings) {
  const parsed = z.string().trim().email().safeParse(env.ORDER_OWNER_EMAIL)
  return parsed.success ? parsed.data : undefined
}

function orderTrackingUrl(order: StoredOrder) {
  const url = new URL('/track-order', order.siteOrigin)
  url.searchParams.set('order', order.orderNumber)
  return url.toString()
}

function notificationPayload(order: StoredOrder, kind: OrderNotificationKind, audience: StoredOrderNotification['audience'], createdAt: string, ownerEmail?: string): StoredOrderNotification['payload'] {
  const point = `${order.shippingAddress.paxiPointName} (${order.shippingAddress.paxiPointCode})`
  const parcel = order.tracking?.trackingNumber
  const messages = {
    confirmed: { subject: 'New paid order', text: 'Payment has been received and this order is confirmed.' },
    shipped: { subject: 'Your order is on its way', text: `Your order has been handed to PAXI for delivery to ${point}.` },
    ready_for_collection: { subject: 'Your order has arrived at PAXI', text: `Your order has arrived at ${point} and is ready for collection.` },
    delivered: { subject: 'Your order has been collected', text: `Your order has been marked as collected from ${point}.` },
  }
  const message = messages[kind]
  const recordedAt = new Date(createdAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'long', timeStyle: 'short' })
  const trackingLines = [
    `Update recorded: ${recordedAt} SAST`,
    `PAXI collection point: ${point}`,
    ...(parcel ? [`PAXI parcel number: ${parcel}`] : []),
    ...(kind === 'ready_for_collection' ? ['Bring your proof of identity and the collection PIN sent to you by PAXI. Follow PAXI\'s collection instructions; contact the store if you have not received them.'] : []),
    '', `Track your order: ${orderTrackingUrl(order)}`,
    'Enter your order number and the checkout email address to see the latest updates.',
    'Check the tracking page for the current order status if this email reached you later.',
    'Official PAXI parcel tracking: https://www.paxi.co.za/track-a-parcel',
  ]
  if (audience === 'owner') {
    const ownerSubject = { confirmed: 'New paid order', shipped: 'Order handed to PAXI', ready_for_collection: 'Order ready at PAXI', delivered: 'Order collected' }[kind]
    return {
      to: ownerEmail?.trim() ? [ownerEmail.trim()] : [],
      subject: `ONLINE ${order.orderNumber}: ${ownerSubject}`,
      text: [
        `Order ${order.orderNumber}: ${ownerSubject}.`, '',
        `Customer: ${order.shippingAddress.fullName}`, `Customer email: ${order.email}`,
        `Customer phone: ${order.shippingAddress.phone}`, '',
        ...order.items.map(item => `${item.quantity} x ${item.name} - Size: ${item.size || 'Not recorded'} - Colour: ${item.requestedColour}`),
        '', `Total paid: R${(order.total / 100).toFixed(2)} ZAR`, '', ...trackingLines,
        '', `Manage this order: ${new URL('/manage-orders', order.siteOrigin).toString()}`,
      ].join('\n'),
    }
  }
  return {
    to: [order.email], subject: `ONLINE ${order.orderNumber}: ${message.subject}`,
    text: [
      `Hi ${order.shippingAddress.fullName},`, '', message.text,
      `Order number: ${order.orderNumber}`, '', ...trackingLines,
      '', 'Thank you for shopping with ONLINE.',
    ].join('\n'),
  }
}

// Call inside the same store.update as the actual status change. Existing orders
// are never backfilled, and repeated admin requests cannot queue duplicate mail.
export function enqueueOrderNotification(order: StoredOrder, kind: OrderNotificationKind, env: EmailBindings = {}): boolean {
  if (order.paymentStatus !== 'paid') return false
  const audiences: StoredOrderNotification['audience'][] = kind === 'confirmed' ? ['owner'] : ['customer', 'owner']
  const createdAt = new Date().toISOString()
  const ownerEmail = ownerRecipient(env)
  let queued = false
  for (const audience of audiences) {
    if (order.notificationEmails?.some(notification => notification.kind === kind && notification.audience === audience)) continue
    order.notificationEmails ||= []
    order.notificationEmails.push({
      kind, audience, status: 'pending', createdAt, attempts: 0,
      payload: notificationPayload(order, kind, audience, createdAt, ownerEmail),
    })
    queued = true
  }
  return queued
}

async function sendNotification(store: OrderStore, orderNumber: string, kind: OrderNotificationKind, audience: StoredOrderNotification['audience'], env: EmailBindings, fetcher: typeof fetch) {
  const initial = await store.find(orderNumber)
  const initialNotification = initial?.notificationEmails?.find(notification => notification.kind === kind && notification.audience === audience)
  if (!initial || initial.paymentStatus !== 'paid' || !initialNotification || initialNotification.status === 'sent') return initial
  const ownerEmail = ownerRecipient(env)
  if (!env.RESEND_API_KEY?.trim() || !env.ORDER_FROM_EMAIL?.trim() || (!initialNotification.payload.to.length && !ownerEmail)) {
    return store.update(orderNumber, order => {
      const notification = order.notificationEmails?.find(item => item.kind === kind && item.audience === audience)
      if (!notification || notification.status === 'sent' || notification.status === 'not_configured' || (notification.leaseUntil || 0) > Date.now()) return false
      notification.status = 'not_configured'
    })
  }
  const claim = randomUUID()
  const now = Date.now()
  const claimed = await store.update(orderNumber, order => {
    const notification = order.notificationEmails?.find(item => item.kind === kind && item.audience === audience)
    if (!notification || notification.status === 'sent' || order.paymentStatus !== 'paid' || (notification.leaseUntil || 0) > now || (notification.retryAfter || 0) > now) return false
    // Provider idempotency expires after 24 hours. Preserve an ambiguous result
    // for manual investigation instead of risking a duplicate after expiry.
    if (notification.firstAttemptAt && now - notification.firstAttemptAt > retryWindow) {
      if (notification.status === 'failed') return false
      notification.status = 'failed'
      return
    }
    notification.claim = claim
    notification.leaseUntil = now + 60_000
    notification.firstAttemptAt ||= now
    notification.payload.from ||= env.ORDER_FROM_EMAIL!.trim()
    if (!notification.payload.to.length) notification.payload.to = [ownerEmail!]
    notification.status = 'pending'
    notification.attempts += 1
  })
  const notification = claimed.notificationEmails?.find(item => item.kind === kind && item.audience === audience)
  if (notification?.claim !== claim) return claimed
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `order-notification/${orderNumber}/${audience}/${kind}`,
      },
      body: JSON.stringify(notification.payload), signal: AbortSignal.timeout(12_000),
    })
    const result = await response.json() as { id?: string }
    if (!response.ok || !result.id) throw new Error('Email provider did not accept the message.')
    return store.update(orderNumber, order => {
      const current = order.notificationEmails?.find(item => item.kind === kind && item.audience === audience)
      if (!current || current.claim !== claim || current.status === 'sent') return false
      current.status = 'sent'
      current.sentAt = new Date().toISOString()
      current.providerId = result.id
      delete current.claim
      delete current.leaseUntil
      delete current.retryAfter
    })
  } catch {
    return store.update(orderNumber, order => {
      const current = order.notificationEmails?.find(item => item.kind === kind && item.audience === audience)
      if (!current || current.claim !== claim || current.status === 'sent') return false
      current.status = 'failed'
      current.retryAfter = Date.now() + Math.min(60 * 60_000, 60_000 * (2 ** Math.min(current.attempts, 6)))
      delete current.claim
      delete current.leaseUntil
    })
  }
}

export async function sendOrderNotifications(store: OrderStore, orderNumber: string, env: EmailBindings, fetcher: typeof fetch = fetch) {
  const order = await store.find(orderNumber)
  if (!order || order.paymentStatus !== 'paid') return order
  // There are at most seven independent jobs per order. Bound request latency
  // to one provider timeout; rate-limited jobs retain their individual backoff.
  await Promise.all((order.notificationEmails || []).filter(notification => notification.status !== 'sent')
    .map(notification => sendNotification(store, orderNumber, notification.kind, notification.audience, env, fetcher)))
  return store.find(orderNumber)
}

function emailPayload(order: StoredOrder, from: string) {
  const money = (amount: number) => `R${(amount / 100).toFixed(2)}`
  const trackingUrl = new URL('/track-order', order.siteOrigin)
  trackingUrl.searchParams.set('order', order.orderNumber)
  return {
    from, to: [order.email], subject: `Your ONLINE order ${order.orderNumber} is confirmed`,
    text: [
      `Hi ${order.shippingAddress.fullName},`, '',
      `We have received your payment. Your order number is ${order.orderNumber}.`, '',
      ...order.items.map(item => `${item.quantity} × ${item.name} — Size: ${item.size || 'Not recorded'} — Colour: ${item.requestedColour} — ${money(item.unitAmount * item.quantity)}`),
      '', `Subtotal: ${money(order.subtotal)}`, `Delivery: ${money(order.shippingFee)}`, `Total paid: ${money(order.total)} ZAR`, '',
      `PAXI collection point: ${order.shippingAddress.paxiPointName} (${order.shippingAddress.paxiPointCode})`,
      '', `Track your order: ${trackingUrl.toString()}`,
      'Enter your order number and this email address to see our latest fulfilment updates.',
      'Once handed to PAXI, your parcel number will appear on your order tracking page.',
      'Official PAXI parcel tracking: https://www.paxi.co.za/track-a-parcel',
      'We will confirm any requested colour availability before preparing your order.', '',
      'Thank you for shopping with ONLINE.',
    ].join('\n'),
  }
}

export async function sendOrderEmail(store: OrderStore, orderNumber: string, env: EmailBindings, fetcher: typeof fetch = fetch) {
  const initial = await store.find(orderNumber)
  if (!initial || initial.paymentStatus !== 'paid' || initial.emailStatus === 'sent') return initial
  if (!env.RESEND_API_KEY?.trim() || !env.ORDER_FROM_EMAIL?.trim()) {
    return store.update(orderNumber, order => {
      if (order.emailStatus === 'sent') return false
      order.emailStatus = 'not_configured'
    })
  }
  const claim = randomUUID()
  const now = Date.now()
  const claimed = await store.update(orderNumber, order => {
    if (order.emailStatus === 'sent' || order.paymentStatus !== 'paid' || (order.emailLeaseUntil || 0) > now || (order.emailRetryAfter || 0) > now) return false
    // Resend remembers an idempotency key for 24 hours. Stop ambiguous retries
    // before that expires; the owner must inspect the provider delivery log.
    if (order.emailFirstAttemptAt && now - order.emailFirstAttemptAt > 23 * 60 * 60 * 1000) {
      if (order.emailStatus === 'failed') return false
      order.emailStatus = 'failed'
      return
    }
    order.emailClaim = claim
    order.emailLeaseUntil = now + 60_000
    order.emailFirstAttemptAt ||= now
    order.emailPayload ||= emailPayload(order, env.ORDER_FROM_EMAIL!.trim())
    order.emailStatus = 'pending'
    order.emailAttempts += 1
  })
  if (claimed.emailClaim !== claim) return claimed
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-confirmation/${orderNumber}` },
      body: JSON.stringify(claimed.emailPayload), signal: AbortSignal.timeout(12_000),
    })
    const result = await response.json() as { id?: string }
    if (!response.ok || !result.id) throw new Error('Email provider did not accept the message.')
    return store.update(orderNumber, order => {
      if (order.emailClaim !== claim || order.emailStatus === 'sent') return false
      order.emailStatus = 'sent'
      order.emailProviderId = result.id
      delete order.emailClaim
      delete order.emailLeaseUntil
      delete order.emailRetryAfter
    })
  } catch {
    return store.update(orderNumber, order => {
      if (order.emailClaim !== claim || order.emailStatus === 'sent') return false
      order.emailStatus = 'failed'
      order.emailRetryAfter = Date.now() + Math.min(60 * 60_000, 60_000 * (2 ** Math.min(order.emailAttempts, 6)))
      delete order.emailClaim
      delete order.emailLeaseUntil
    })
  }
}

export async function retryOrderEmails(store: OrderStore, env: EmailBindings, fetcher: typeof fetch = fetch) {
  if (!env.RESEND_API_KEY?.trim() || !env.ORDER_FROM_EMAIL?.trim()) return { checked: 0, sent: 0 }
  const orders = await store.emailQueue()
  let sent = 0
  for (const order of orders) {
    const result = await sendOrderEmail(store, order.orderNumber, env, fetcher)
    if (result?.emailStatus === 'sent') sent++
  }
  let checked = orders.length
  const ownerConfigured = !!ownerRecipient(env)
  const notificationOrders = await store.notificationEmailQueue(20, ownerConfigured)
  const now = Date.now()
  for (const order of notificationOrders) {
    const due = (order.notificationEmails || []).filter(notification => notification.status !== 'sent'
      && (notification.retryAfter || 0) <= now && (notification.leaseUntil || 0) <= now
      && (!notification.firstAttemptAt || now - notification.firstAttemptAt <= retryWindow)
      && (notification.payload.to.length > 0 || ownerConfigured))
    if (!due.length) continue
    checked += due.length
    const result = await sendOrderNotifications(store, order.orderNumber, env, fetcher)
    sent += due.filter(notification => result?.notificationEmails?.some(item => item.kind === notification.kind && item.audience === notification.audience && item.status === 'sent')).length
  }
  return { checked, sent }
}
