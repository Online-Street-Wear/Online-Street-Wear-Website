import type { ProductSize } from './product-options.ts'

export type OrderStatus = 'pending_payment' | 'confirmed' | 'processing' | 'shipped' | 'ready_for_collection' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'abandoned'
export type EmailStatus = 'pending' | 'sent' | 'failed' | 'not_configured'
export type OrderNotificationKind = 'confirmed' | 'shipped' | 'ready_for_collection' | 'delivered'

export interface OrderNotification {
  kind: OrderNotificationKind
  status: EmailStatus
  createdAt: string
  sentAt?: string
}

export interface ShippingAddress {
  fullName: string
  phone: string
  paxiPointCode: string
  paxiPointName: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  postalCode?: string
}

export interface CheckoutRequest {
  email: string
  shippingProvince: string
  shippingAddress: ShippingAddress
  items: { productId: string; quantity: number; size: ProductSize; requestedColour?: string }[]
  site_url?: string
}

export interface OrderTracking {
  courier: string
  trackingNumber: string
  url?: string
}

// Monetary values in this API are integer South African cents.
export interface PublicOrder {
  orderNumber: string
  paymentMode: 'test' | 'live'
  status: OrderStatus
  paymentStatus: PaymentStatus
  emailStatus: EmailStatus
  notifications?: OrderNotification[]
  // Orders placed before size selection was available have no recorded size.
  items: { productId: string; name: string; quantity: number; size?: ProductSize; requestedColour: string; unitAmount: number }[]
  subtotal: number
  shippingFee: number
  total: number
  currency: 'ZAR'
  createdAt: string
  updatedAt: string
  history: { status: OrderStatus; at: string }[]
  tracking?: OrderTracking
  collectionPoint?: { code: string; name: string }
}

export interface AdminOrder extends PublicOrder {
  email: string
  shippingProvince: string
  shippingAddress: ShippingAddress
  ownerNotifications?: OrderNotification[]
}
