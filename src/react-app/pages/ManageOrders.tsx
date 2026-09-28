import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Loader2, LockKeyhole, Package, RefreshCw } from 'lucide-react';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';
import OrderDetails from '@/react-app/components/OrderDetails';
import { ORDER_STATUS_LABELS, PAXI_TRACKING_URL, formatOrderMoney } from '@/react-app/lib/orders';
import type { AdminOrder, EmailStatus, OrderNotificationKind, OrderStatus } from '../../shared/orders';

interface EmailSettings {
  providerConfigured: boolean;
  senderConfigured: boolean;
  ownerConfigured: boolean;
}

const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  pending: 'Queued',
  sent: 'Submitted for delivery',
  failed: 'Send failed',
  not_configured: 'Email setup needed',
};

const NOTIFICATION_LABELS: Record<OrderNotificationKind, string> = {
  confirmed: 'Order confirmation',
  shipped: 'PAXI dispatch',
  ready_for_collection: 'Arrival at selected PAXI point',
  delivered: 'Collected',
};

function hasUnsentEmail(order: AdminOrder) {
  return order.emailStatus !== 'sent'
    || [...(order.notifications || []), ...(order.ownerNotifications || [])].some(notification => notification.status !== 'sent');
}

async function adminRequest<T>(path: string, key: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...options.headers },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'The order service is unavailable. Please try again.');
  return result as T;
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['ready_for_collection'],
  ready_for_collection: ['delivered'],
  delivered: [],
  cancelled: [],
};

function OrderEditor({ order, accessKey, onUpdated }: {
  order: AdminOrder; accessKey: string; onUpdated: (order: AdminOrder) => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [parcelNumber, setParcelNumber] = useState(order.tracking?.trackingNumber || '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const hasParcel = ['shipped', 'ready_for_collection', 'delivered'].includes(status);

  useEffect(() => {
    setStatus(order.status);
    setParcelNumber(order.tracking?.trackingNumber || '');
  }, [order.status, order.tracking?.trackingNumber]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setFeedback('');
    try {
      const result = await adminRequest<{ order: AdminOrder }>(
        `/api/admin/orders/${encodeURIComponent(order.orderNumber)}`, accessKey,
        { method: 'PATCH', body: JSON.stringify({ status, ...(hasParcel ? {
          tracking: { courier: 'PAXI', trackingNumber: parcelNumber.trim(), url: PAXI_TRACKING_URL },
        } : {}) }) },
      );
      onUpdated(result.order);
      setFeedback(`Order updated. The customer can see this progress on their tracking page.${order.paymentStatus === 'paid' && hasUnsentEmail(result.order) ? ' Some emails have not been submitted yet; review the notification statuses below.' : ''}`);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to update the order.'); }
    finally { setBusy(false); }
  };

  const retryEmail = async () => {
    setBusy(true); setError(''); setFeedback('');
    try {
      const result = await adminRequest<{ order: AdminOrder }>(
        `/api/admin/orders/${encodeURIComponent(order.orderNumber)}/retry-email`, accessKey, { method: 'POST' },
      );
      onUpdated(result.order);
      setFeedback(hasUnsentEmail(result.order)
        ? 'Some emails are still unsent. Review the notification statuses and email setup before retrying.'
        : 'All recorded order emails have been submitted for delivery.');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to retry the email.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-border bg-muted p-5 sm:p-7">
      <h2 className="text-xl font-bold">Fulfil this order</h2>
      <div className="my-5 space-y-1 text-sm">
        <p className="font-semibold">{order.shippingAddress.fullName}</p>
        <p>{order.email}</p><p>{order.shippingAddress.phone}</p>
        <p className="pt-2 font-semibold">PAXI collection point</p>
        <p>{order.shippingAddress.paxiPointName || 'No collection point on this earlier order'}</p>
        <p>{order.shippingAddress.paxiPointCode}</p>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">Register and drop off the parcel with PAXI, then enter its parcel number below. Update each stage after PAXI confirms it. Dispatch, arrival and collection updates prepare emails for the customer and store owner.</p>
      <a href="https://portal.paxi.co.za" target="_blank" rel="noopener noreferrer" className="inline-block mb-5 text-sm font-semibold text-red-500 underline underline-offset-4">Open PAXI parcel portal</a>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="fulfilment-status" className="mb-2 block text-sm font-medium">Order status</label>
          <select id="fulfilment-status" value={status} onChange={event => setStatus(event.target.value as OrderStatus)} className="w-full rounded-lg border border-border bg-background px-3 py-3" disabled={busy}>
            {[order.status, ...NEXT_STATUS[order.status]].map(value => <option key={value} value={value}>{ORDER_STATUS_LABELS[value]}</option>)}
          </select>
        </div>
        {hasParcel && <div>
          <label htmlFor="paxi-parcel-number" className="mb-2 block text-sm font-medium">PAXI parcel number</label>
          <input id="paxi-parcel-number" value={parcelNumber} onChange={event => setParcelNumber(event.target.value)} required maxLength={100} className="w-full rounded-lg border border-border bg-background px-3 py-3" disabled={busy} />
        </div>}
        {status === 'shipped' && status !== order.status && <p className="text-sm text-muted-foreground">Confirm that the parcel has been handed to PAXI for delivery to {order.shippingAddress.paxiPointName} ({order.shippingAddress.paxiPointCode}).</p>}
        {status === 'ready_for_collection' && status !== order.status && <p className="rounded-lg border border-green-600/30 bg-green-500/10 p-4 text-sm">Confirm that PAXI has reported arrival at <strong>{order.shippingAddress.paxiPointName} ({order.shippingAddress.paxiPointCode})</strong>. Saving marks the order ready to collect and prepares an arrival email for the customer and store owner. PAXI provides the customer's collection PIN.</p>}
        {status === 'delivered' && status !== order.status && <p className="text-sm text-muted-foreground">Mark as collected after PAXI confirms the customer has collected the parcel.</p>}
        {status === 'cancelled' && order.paymentStatus === 'paid' && <p className="text-sm text-amber-600">Cancelling fulfilment does not refund the Paystack payment. Arrange any refund in Paystack separately.</p>}
        <button disabled={busy || (status === order.status && (!hasParcel || parcelNumber.trim() === order.tracking?.trackingNumber))} className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-3 font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {status !== order.status && status === 'ready_for_collection' ? 'Confirm PAXI arrival' : status !== order.status && status === 'delivered' ? 'Mark as collected' : 'Save order update'}
        </button>
      </form>
      <div className="mt-6 space-y-4 border-t border-border pt-5 text-sm">
        <h3 className="font-bold">Email notifications</h3>
        <div>
          <p className="font-semibold">Customer</p>
          <p className="mt-2">Order confirmation: <strong>{order.paymentStatus !== 'paid' ? 'Waiting for payment' : EMAIL_STATUS_LABELS[order.emailStatus]}</strong></p>
          {(order.notifications || []).map((notification, index) => <p className="mt-2" key={`${notification.kind}-${index}`}>{NOTIFICATION_LABELS[notification.kind]}: <strong>{EMAIL_STATUS_LABELS[notification.status]}</strong></p>)}
        </div>
        <div>
          <p className="font-semibold">Store owner</p>
          {(order.ownerNotifications || []).map((notification, index) => <p className="mt-2" key={`${notification.kind}-${index}`}>{NOTIFICATION_LABELS[notification.kind]}: <strong>{EMAIL_STATUS_LABELS[notification.status]}</strong></p>)}
          {!order.ownerNotifications?.length && <p className="mt-2 text-muted-foreground">No owner notifications recorded for this order.</p>}
        </div>
        <p className="text-muted-foreground">Submitted means the email service accepted the message for delivery. It does not confirm that it reached the inbox.</p>
        {order.paymentStatus === 'paid' && hasUnsentEmail(order) && <button type="button" onClick={retryEmail} disabled={busy} className="font-semibold underline underline-offset-4 disabled:opacity-50">Retry unsent emails</button>}
      </div>
      {feedback && <p role="status" className="mt-4 text-sm text-green-600">{feedback}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
    </section>
  );
}

export default function ManageOrders() {
  const [keyInput, setKeyInput] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedNumber, setSelectedNumber] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = orders.find(order => order.orderNumber === selectedNumber);
  const missingEmailSettings = emailSettings ? [
    !emailSettings.providerConfigured && 'RESEND_API_KEY',
    !emailSettings.senderConfigured && 'ORDER_FROM_EMAIL (a verified sender)',
    !emailSettings.ownerConfigured && 'ORDER_OWNER_EMAIL',
  ].filter(Boolean) : [];

  async function load(key: string, query = '', cursor?: string) {
    const sequence = ++requestSequence.current;
    setBusy(true); setError('');
    try {
      const params = new URLSearchParams({ search: query.trim() });
      if (cursor) params.set('cursor', cursor);
      const [result, settings] = await Promise.all([
        adminRequest<{ orders: AdminOrder[]; nextCursor: string | null }>(`/api/admin/orders?${params}`, key),
        adminRequest<EmailSettings>('/api/admin/email-settings', key).catch(() => null),
      ]);
      if (sequence !== requestSequence.current) return;
      setOrders(current => cursor ? [...current, ...result.orders.filter(order => !current.some(existing => existing.orderNumber === order.orderNumber))] : result.orders);
      setAccessKey(key); setKeyInput(''); setAppliedSearch(query.trim()); setNextCursor(result.nextCursor);
      setEmailSettings(settings);
    } catch (problem) { if (sequence === requestSequence.current) setError(problem instanceof Error ? problem.message : 'Unable to load orders.'); }
    finally { if (sequence === requestSequence.current) setBusy(false); }
  }
  const onUpdated = (updated: AdminOrder) => setOrders(current => current.map(order => order.orderNumber === updated.orderNumber ? { ...order, ...updated } : order));

  return <div className="min-h-screen bg-background text-foreground">
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'Anton, sans-serif' }}>MANAGE ORDERS</h1><p className="mt-2 text-muted-foreground">Prepare orders and update PAXI collection progress.</p></div>
        {accessKey && <button onClick={() => { requestSequence.current++; setBusy(false); setAccessKey(''); setOrders([]); setSelectedNumber(''); setNextCursor(null); setEmailSettings(null); }} className="text-sm underline underline-offset-4">Lock order management</button>}
      </div>
      {accessKey && missingEmailSettings.length > 0 && <div role="status" className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
        <p className="font-semibold">Order email setup is incomplete</p>
        <p className="mt-2">Configure {missingEmailSettings.join(', ')} on the server to enable customer and owner emails, then retry unsent emails on each order. Saved order and PAXI status updates remain available on the tracking page.</p>
      </div>}
      {!accessKey ? <form onSubmit={event => { event.preventDefault(); void load(keyInput.trim()); }} className="mx-auto max-w-lg space-y-5 rounded-xl border border-border p-6">
        <LockKeyhole className="h-8 w-8 text-red-500" />
        <h2 className="text-xl font-bold">Store owner access</h2>
        <p className="text-sm text-muted-foreground">Enter your private order management key. Access lasts until you leave or reload this page.</p>
        <label htmlFor="order-access-key" className="block text-sm font-medium">Order management key</label>
        <input id="order-access-key" type="password" autoComplete="off" value={keyInput} onChange={event => setKeyInput(event.target.value)} required className="w-full rounded-lg border border-border bg-background p-3" />
        <button disabled={busy} className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Unlock orders</button>
      </form> : <div className="grid gap-6 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <section aria-label="Order list" className="space-y-4">
          <form onSubmit={event => { event.preventDefault(); void load(accessKey, search); }} className="flex flex-wrap items-center gap-2">
            <input aria-label="Search all orders" placeholder="Order number or email" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3" />
            <button type="submit" disabled={busy} className="rounded-lg border border-border p-3 text-sm font-semibold disabled:opacity-50">Search</button>
            <button type="button" aria-label="Refresh orders" onClick={() => void load(accessKey, appliedSearch)} disabled={busy} className="rounded-lg border border-border p-3"><RefreshCw className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} /></button>
          </form>
          <p className="text-sm text-muted-foreground">Showing {orders.length} orders{nextCursor ? ' · more available' : ''}</p>
          {orders.map(order => <button key={order.orderNumber} onClick={() => setSelectedNumber(order.orderNumber)} className={`block w-full rounded-xl border p-4 text-left ${selectedNumber === order.orderNumber ? 'border-red-500 bg-red-500/5' : 'border-border bg-muted'}`}>
            <p className="break-all font-semibold">{order.orderNumber}</p><p className="mt-1 break-all text-sm text-muted-foreground">{order.email}</p>
            {order.paymentMode === 'test' && <p className="mt-2 text-xs font-semibold text-amber-600">TEST PAYMENT — no real money received</p>}
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm"><span>{ORDER_STATUS_LABELS[order.status]}</span><strong>{formatOrderMoney(order.total, order.currency)}</strong></div>
          </button>)}
          {!orders.length && <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">{appliedSearch ? 'No orders matched. Try the exact order number or checkout email.' : 'New checkout orders will appear here.'}</p>}
          {nextCursor && <button disabled={busy} onClick={() => void load(accessKey, appliedSearch, nextCursor)} className="w-full rounded-lg border border-border px-4 py-3 font-semibold disabled:opacity-50">Load more orders</button>}
        </section>
        {selected ? <div className="space-y-6"><OrderEditor key={selected.orderNumber} order={selected} accessKey={accessKey} onUpdated={onUpdated} /><OrderDetails order={selected} /></div> : <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-border p-8 text-center"><Package className="mb-4 h-10 w-10 text-muted-foreground" /><p>Select an order to see its colour requests and PAXI collection details.</p></div>}
      </div>}
      {error && <p role="alert" className="mt-6 text-red-500">{error}</p>}
      <Link to="/" className="mt-8 inline-block text-sm underline underline-offset-4">Back to Home</Link>
    </main>
    <Footer />
  </div>;
}
