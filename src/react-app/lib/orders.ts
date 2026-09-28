import type { CheckoutRequest, OrderStatus, PaymentStatus, PublicOrder } from '@/shared/orders';

export type { CheckoutRequest, OrderStatus } from '@/shared/orders';
export type OrderSummary = PublicOrder;

export interface VerifyPaymentResult {
  paid: boolean;
  paymentStatus: PaymentStatus;
  order: OrderSummary;
}

export interface PendingPayment {
  reference: string;
  orderNumber: string;
  trackingToken: string;
  purchasedItems: { id: string; quantity: number }[];
  cartSettled?: boolean;
}

const STORAGE_PREFIX = 'online-streetwear:payment:';
const LATEST_PAYMENT_KEY = 'online-streetwear:latest-payment';

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, options);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : null;
    throw new Error(typeof error === 'string' ? error : 'We could not reach the order service. Please try again.');
  }
  if (!body || typeof body !== 'object') {
    throw new Error('The order service returned an unexpected response. Please try again.');
  }
  return body as T;
}

export async function createPayment(body: CheckoutRequest, signal?: AbortSignal) {
  const result = await requestJson<{
    authorization_url: string;
    reference: string;
    orderNumber: string;
    trackingToken: string;
  }>('/api/payments/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!result.reference || !result.orderNumber || !result.trackingToken || !result.authorization_url) {
    throw new Error('We could not save your order details. Please try again.');
  }
  const checkoutUrl = new URL(result.authorization_url);
  if (checkoutUrl.protocol !== 'https:') {
    throw new Error('The payment service did not return a secure checkout link.');
  }
  return result;
}

export function verifyPayment(reference: string, token: string, signal?: AbortSignal) {
  return requestJson<VerifyPaymentResult>(
    `/api/payments/verify/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`,
    { signal },
  );
}

export function trackOrder(orderNumber: string, email: string, signal?: AbortSignal) {
  return requestJson<{ order: OrderSummary }>('/api/orders/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
    signal,
  });
}

export function getOrder(orderNumber: string, token: string, signal?: AbortSignal) {
  return requestJson<{ order: OrderSummary }>(
    `/api/orders/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(token)}`,
    { signal },
  );
}

export function savePendingPayment(payment: PendingPayment) {
  try {
    localStorage.setItem(STORAGE_PREFIX + payment.reference, JSON.stringify(payment));
    localStorage.setItem(LATEST_PAYMENT_KEY, payment.reference);
  } catch {
    throw new Error('Allow browser storage so we can keep your order details when you return from payment.');
  }
}

export function getPendingPayment(reference?: string): PendingPayment | null {
  try {
    const savedReference = reference || localStorage.getItem(LATEST_PAYMENT_KEY);
    if (!savedReference) return null;
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_PREFIX + savedReference) || 'null');
    if (!stored || typeof stored !== 'object') return null;
    const candidate = stored as Partial<PendingPayment>;
    if (candidate.reference !== savedReference || typeof candidate.trackingToken !== 'string'
      || typeof candidate.orderNumber !== 'string' || !Array.isArray(candidate.purchasedItems)) return null;
    return candidate as PendingPayment;
  } catch {
    return null;
  }
}

// Claim before changing the cart so repeated effects, retries and reloads cannot remove items twice.
export function claimPurchasedItems(reference: string) {
  const pending = getPendingPayment(reference);
  if (!pending || pending.cartSettled) return [];
  const purchased = pending.purchasedItems.filter(item =>
    typeof item?.id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0,
  );
  savePendingPayment({ ...pending, purchasedItems: [], cartSettled: true });
  return purchased;
}

export function orderTrackingPath(orderNumber: string, token?: string) {
  const params = new URLSearchParams({ order: orderNumber });
  if (token) params.set('token', token);
  return `/track-order?${params}`;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Order confirmed',
  processing: 'Packing your order',
  shipped: 'On the way to your PAXI point',
  ready_for_collection: 'Arrived at PAXI - ready to collect',
  delivered: 'Collected',
  cancelled: 'Cancelled',
};

export const PAXI_TRACKING_URL = 'https://www.paxi.co.za/track-a-parcel';

export function formatOrderMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount / 100);
}

export function formatOrderDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString('en-ZA', {
    dateStyle: 'medium', timeStyle: 'short',
  });
}
