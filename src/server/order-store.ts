import type { AdminOrder, OrderNotification, PublicOrder, ShippingAddress } from '../shared/orders.ts'

export interface StoredOrderNotification extends OrderNotification {
  audience: 'customer' | 'owner'
  attempts: number
  claim?: string
  leaseUntil?: number
  firstAttemptAt?: number
  retryAfter?: number
  providerId?: string
  // Recipient and content are frozen when the fulfilment update is saved.
  // The sender is frozen at the first attempt, once email is configured.
  payload: { from?: string; to: string[]; subject: string; text: string }
}

export interface StoredOrder extends PublicOrder {
  reference: string
  tokenHash: string
  email: string
  shippingProvince: string
  shippingAddress: ShippingAddress
  siteOrigin: string
  emailClaim?: string
  emailLeaseUntil?: number
  emailFirstAttemptAt?: number
  emailRetryAfter?: number
  emailAttempts: number
  emailProviderId?: string
  // A fixed payload is retried with the same provider idempotency key.
  emailPayload?: { from: string; to: string[]; subject: string; text: string }
  notificationEmails?: StoredOrderNotification[]
}

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<{ meta: { changes?: number } }>
}
export interface SqlDatabase { prepare(sql: string): SqlStatement }

export const ORDER_SCHEMA = `
CREATE TABLE IF NOT EXISTS customer_orders (
  order_number TEXT PRIMARY KEY,
  payment_reference TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_orders_email ON customer_orders(customer_email);
CREATE INDEX IF NOT EXISTS customer_orders_created ON customer_orders(created_at);
`

type Row = { body: string; version: number }
export interface OrderCursor { createdAt: string; orderNumber: string }
type OrderListRow = { body: string; created_at: string; order_number: string }

export class OrderStore {
  private db: SqlDatabase
  constructor(db: SqlDatabase) { this.db = db }

  async insert(order: StoredOrder) {
    await this.db.prepare('INSERT INTO customer_orders (order_number, payment_reference, customer_email, created_at, body) VALUES (?, ?, ?, ?, ?)')
      .bind(order.orderNumber, order.reference, order.email, order.createdAt, JSON.stringify(order)).run()
  }

  async find(orderNumber: string): Promise<StoredOrder | null> {
    const row = await this.db.prepare('SELECT body, version FROM customer_orders WHERE order_number = ?').bind(orderNumber).first<Row>()
    return row ? JSON.parse(row.body) as StoredOrder : null
  }

  async byReference(reference: string): Promise<StoredOrder | null> {
    const row = await this.db.prepare('SELECT body FROM customer_orders WHERE payment_reference = ?').bind(reference).first<Row>()
    return row ? JSON.parse(row.body) as StoredOrder : null
  }

  async list(limit = 100): Promise<StoredOrder[]> {
    const rows = await this.db.prepare('SELECT body FROM customer_orders ORDER BY created_at DESC LIMIT ?').bind(limit).all<Row>()
    return rows.results.map(row => JSON.parse(row.body) as StoredOrder)
  }

  async listPage({ search = '', cursor, limit = 50 }: { search?: string; cursor?: OrderCursor; limit?: number } = {}) {
    const conditions: string[] = []
    const values: unknown[] = []
    if (search) {
      conditions.push('(instr(lower(order_number), ?) > 0 OR instr(lower(customer_email), ?) > 0)')
      values.push(search.toLowerCase(), search.toLowerCase())
    }
    if (cursor) {
      conditions.push('(created_at < ? OR (created_at = ? AND order_number < ?))')
      values.push(cursor.createdAt, cursor.createdAt, cursor.orderNumber)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = await this.db.prepare(`SELECT body, created_at, order_number FROM customer_orders ${where} ORDER BY created_at DESC, order_number DESC LIMIT ?`)
      .bind(...values, limit + 1).all<OrderListRow>()
    const page = rows.results.slice(0, limit)
    const last = page.at(-1)
    return {
      orders: page.map(row => JSON.parse(row.body) as StoredOrder),
      nextCursor: rows.results.length > limit && last ? { createdAt: last.created_at, orderNumber: last.order_number } : null,
    }
  }

  async emailQueue(limit = 20): Promise<StoredOrder[]> {
    const now = Date.now()
    const rows = await this.db.prepare("SELECT body FROM customer_orders WHERE json_extract(body, '$.paymentStatus') = 'paid' AND json_extract(body, '$.emailStatus') != 'sent' AND COALESCE(json_extract(body, '$.emailRetryAfter'), 0) <= ? AND COALESCE(json_extract(body, '$.emailLeaseUntil'), 0) <= ? AND (json_extract(body, '$.emailFirstAttemptAt') IS NULL OR json_extract(body, '$.emailFirstAttemptAt') >= ?) ORDER BY created_at ASC LIMIT ?")
      .bind(now, now, now - 23 * 60 * 60 * 1000, limit).all<Row>()
    return rows.results.map(row => JSON.parse(row.body) as StoredOrder)
  }

  async notificationEmailQueue(limit = 20, ownerConfigured = false): Promise<StoredOrder[]> {
    const now = Date.now()
    const rows = await this.db.prepare(`SELECT body FROM customer_orders
      WHERE json_extract(body, '$.paymentStatus') = 'paid'
      AND EXISTS (SELECT 1 FROM json_each(customer_orders.body, '$.notificationEmails') AS notification
        WHERE json_extract(notification.value, '$.status') != 'sent'
        AND (json_extract(notification.value, '$.audience') = 'customer'
          OR json_array_length(notification.value, '$.payload.to') > 0 OR ? = 1)
        AND COALESCE(json_extract(notification.value, '$.retryAfter'), 0) <= ?
        AND COALESCE(json_extract(notification.value, '$.leaseUntil'), 0) <= ?
        AND (json_extract(notification.value, '$.firstAttemptAt') IS NULL
          OR json_extract(notification.value, '$.firstAttemptAt') >= ?))
      ORDER BY created_at ASC LIMIT ?`)
      .bind(ownerConfigured ? 1 : 0, now, now, now - 23 * 60 * 60 * 1000, limit).all<Row>()
    return rows.results.map(row => JSON.parse(row.body) as StoredOrder)
  }

  // Compare-and-swap prevents callbacks, webhooks and admin edits overwriting each other.
  async update(orderNumber: string, change: (order: StoredOrder) => boolean | void): Promise<StoredOrder> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const row = await this.db.prepare('SELECT body, version FROM customer_orders WHERE order_number = ?').bind(orderNumber).first<Row>()
      if (!row) throw new Error('Order not found.')
      const order = JSON.parse(row.body) as StoredOrder
      if (change(order) === false) return order
      order.updatedAt = new Date().toISOString()
      const result = await this.db.prepare('UPDATE customer_orders SET body = ?, version = version + 1 WHERE order_number = ? AND version = ?')
        .bind(JSON.stringify(order), orderNumber, row.version).run()
      if (result.meta.changes === 1) return order
    }
    throw new Error('Order is busy. Please retry.')
  }
}

export function publicOrder(order: StoredOrder): PublicOrder {
  return {
    orderNumber: order.orderNumber, paymentMode: order.paymentMode, status: order.status, paymentStatus: order.paymentStatus,
    emailStatus: order.emailStatus, items: order.items, subtotal: order.subtotal,
    notifications: notificationSummaries(order, 'customer'),
    shippingFee: order.shippingFee, total: order.total, currency: order.currency,
    createdAt: order.createdAt, updatedAt: order.updatedAt, history: order.history,
    ...(order.tracking ? { tracking: order.tracking } : {}),
    ...(order.shippingAddress.paxiPointCode ? { collectionPoint: { code: order.shippingAddress.paxiPointCode, name: order.shippingAddress.paxiPointName } } : {}),
  }
}

function notificationSummaries(order: StoredOrder, audience: StoredOrderNotification['audience']): OrderNotification[] {
  return (order.notificationEmails || []).filter(notification => notification.audience === audience)
    .map(({ kind, status, createdAt, sentAt }) => ({ kind, status, createdAt, ...(sentAt ? { sentAt } : {}) }))
}

export function adminOrder(order: StoredOrder): AdminOrder {
  return {
    ...publicOrder(order), email: order.email, shippingProvince: order.shippingProvince,
    shippingAddress: order.shippingAddress, ownerNotifications: notificationSummaries(order, 'owner'),
  }
}
