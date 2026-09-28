import { CheckCircle2, ExternalLink, MapPin, Package, Truck } from 'lucide-react';
import { formatOrderDate, formatOrderMoney, ORDER_STATUS_LABELS, PAXI_TRACKING_URL, type OrderSummary } from '@/react-app/lib/orders';
import CopyButton from './CopyButton';

function courierUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export default function OrderDetails({ order, showHistory = true }: { order: OrderSummary; showHistory?: boolean }) {
  const trackingUrl = courierUrl(order.tracking?.url) || PAXI_TRACKING_URL;
  const readyToCollect = order.status === 'ready_for_collection';
  const arrival = [...order.history].reverse().find(event => event.status === 'ready_for_collection');
  return (
    <div className="space-y-6">
      {order.paymentMode === 'test' && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600">Test payment: no real money was received for this order.</p>}
      {order.collectionPoint && (
        <section className={`rounded-xl border p-5 sm:p-7 ${readyToCollect ? 'border-green-600/30 bg-green-500/10' : 'border-border bg-muted'}`} aria-label="PAXI collection point">
          <h2 className="flex items-center gap-2 text-xl font-bold"><MapPin className={`h-5 w-5 shrink-0 ${readyToCollect ? 'text-green-600' : 'text-red-500'}`} /> {readyToCollect ? 'Your order has arrived at PAXI' : order.status === 'delivered' ? 'Collected from PAXI' : 'Your selected PAXI collection point'}</h2>
          <p className="mt-3 font-semibold">{order.collectionPoint.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">Point code: {order.collectionPoint.code}</p>
          {order.tracking?.trackingNumber && <p className="mt-1 break-all text-sm text-muted-foreground">Parcel number: {order.tracking.trackingNumber}</p>}
          {readyToCollect && <div className="mt-4 space-y-2 text-sm">
            <p className="font-semibold">Ready to collect from this point.</p>
            {arrival && <p className="text-muted-foreground">Arrival recorded: {formatOrderDate(arrival.at)}</p>}
            <p>Follow the collection instructions in your PAXI SMS. Bring your collection PIN and ID when you collect.</p>
          </div>}
          {order.status === 'shipped' && <p className="mt-3 text-sm">Your parcel is on the way to this point. Wait for PAXI to confirm it is ready to collect before travelling.</p>}
          {order.status === 'delivered' && <p className="mt-3 text-sm">The store has marked this order as collected.</p>}
        </section>
      )}
      <section className="rounded-xl border border-border bg-muted p-5 sm:p-7" aria-label="Order details">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-sm text-muted-foreground">Order number</p>
            <h2 className="mt-1 break-all text-xl font-bold sm:text-2xl">{order.orderNumber}</h2>
            <div className="mt-2"><CopyButton value={order.orderNumber} label="order number" /></div>
            <p className="mt-2 text-sm text-muted-foreground">Placed {formatOrderDate(order.createdAt)}</p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold">
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
        <ul className="divide-y divide-border">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${item.requestedColour}-${index}`} className="flex justify-between gap-4 py-5">
              <div className="min-w-0">
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">Requested colour: {item.requestedColour || 'As pictured'}</p>
                <p className="mt-1 text-sm text-muted-foreground">Size: {item.size || 'Not recorded'}</p>
                <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity}</p>
              </div>
              <p className="shrink-0 font-medium">{formatOrderMoney(item.unitAmount * item.quantity, order.currency)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-3 border-t border-border pt-5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatOrderMoney(order.subtotal, order.currency)}</dd></div>
          <div className="flex justify-between"><dt>PAXI delivery</dt><dd>{order.shippingFee === 0 ? 'Free' : formatOrderMoney(order.shippingFee, order.currency)}</dd></div>
          <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd>{formatOrderMoney(order.total, order.currency)}</dd></div>
        </dl>
      </section>

      {showHistory && (
        <section className="rounded-xl border border-border bg-muted p-5 sm:p-7" aria-label="Order progress">
          <h2 className="flex items-center gap-2 text-xl font-bold"><Package className="h-5 w-5 text-red-500" /> Order progress</h2>
          <p className="mt-2 text-sm text-muted-foreground">Our store updates this page when PAXI confirms dispatch, arrival at your selected point and collection. Use your parcel number on PAXI’s website for the courier’s latest updates.</p>
          <ol className="mt-6 space-y-5">
            {order.history.map((event, index) => (
              <li key={`${event.status}-${event.at}-${index}`} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div><p className="font-medium">{ORDER_STATUS_LABELS[event.status] || event.status}</p><p className="text-sm text-muted-foreground">{formatOrderDate(event.at)}</p></div>
              </li>
            ))}
          </ol>
          {order.history.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No status updates yet.</p>}
          {order.tracking?.trackingNumber ? (
            <div className="mt-6 rounded-lg border border-border bg-background p-4">
              <h3 className="flex items-center gap-2 font-semibold"><Truck className="h-5 w-5" /> {order.tracking.courier || 'PAXI'}</h3>
              <p className="mt-2 break-all text-sm">Parcel number: {order.tracking.trackingNumber}</p>
              <div className="mt-2"><CopyButton value={order.tracking.trackingNumber} label="PAXI parcel number" /></div>
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:underline">Track with PAXI <ExternalLink className="h-4 w-4" /></a>
              <p className="mt-2 text-sm text-muted-foreground">Enter the parcel number above on the PAXI tracking page.</p>
            </div>
          ) : order.status !== 'cancelled' && order.status !== 'delivered' ? (
            <p className="mt-6 text-sm text-muted-foreground">Your PAXI parcel number will appear here after dispatch.</p>
          ) : null}
        </section>
      )}
    </div>
  );
}
