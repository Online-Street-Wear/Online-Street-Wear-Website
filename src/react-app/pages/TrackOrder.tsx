import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Loader2, PackageSearch, RefreshCw } from 'lucide-react';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';
import OrderDetails from '@/react-app/components/OrderDetails';
import { formatOrderDate, getOrder, getPendingPayment, orderTrackingPath, trackOrder, type OrderSummary } from '@/react-app/lib/orders';

type Lookup = { orderNumber: string; token?: string; email?: string };
const fieldClass = 'w-full rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30';

export default function TrackOrder() {
  const [params] = useSearchParams();
  const linkedOrder = params.get('order') || '';
  const linkedToken = params.get('token') || '';
  const [orderNumber, setOrderNumber] = useState(linkedOrder);
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [lastChecked, setLastChecked] = useState('');
  const requestActive = useRef(false);
  const [recentCheckout] = useState(() => getPendingPayment());

  useEffect(() => {
    setOrderNumber(linkedOrder);
    setLookup(linkedOrder && linkedToken ? { orderNumber: linkedOrder, token: linkedToken } : null);
    setOrder(null);
    setError('');
    setLastChecked('');
  }, [linkedOrder, linkedToken]);

  useEffect(() => {
    const controller = new AbortController();
    if (!lookup) {
      setLoading(false);
      return () => controller.abort();
    }
    requestActive.current = true;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      controller.abort();
      requestActive.current = false;
      setLoading(false);
      setError('The order service is taking too long. Please try again.');
    }, 15_000);
    const response = lookup.token
      ? getOrder(lookup.orderNumber, lookup.token, controller.signal)
      : trackOrder(lookup.orderNumber, lookup.email || '', controller.signal);
    response.then(result => {
      if (!controller.signal.aborted) {
        setOrder(result.order);
        setError('');
        setLastChecked(new Date().toISOString());
      }
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'We could not find your order. Check your details and try again.');
    }).finally(() => {
      window.clearTimeout(timeout);
      if (!controller.signal.aborted) {
        requestActive.current = false;
        setLoading(false);
      }
    });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      requestActive.current = false;
    };
  }, [lookup, attempt]);

  const autoRefresh = Boolean(lookup && order && order.status !== 'delivered' && order.status !== 'cancelled');
  useEffect(() => {
    if (!autoRefresh) return;
    const refresh = () => {
      if (document.visibilityState === 'visible' && !requestActive.current) setAttempt(current => current + 1);
    };
    const interval = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [autoRefresh, lookup]);

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (orderNumber.trim() && email.trim()) {
      setOrder(null);
      setError('');
      setLastChecked('');
      setLookup({ orderNumber: orderNumber.trim(), email: email.trim() });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="flex items-center gap-3 text-3xl font-bold sm:text-4xl"><PackageSearch className="h-8 w-8 shrink-0 text-red-500" /> Track your order</h1>
            <p className="mt-3 text-muted-foreground">Follow your order from confirmation to collection at your PEP/PAXI point.</p>
          </header>
          {!linkedOrder && !lookup && recentCheckout?.trackingToken && <section className="mb-6 rounded-xl border border-border bg-muted p-5">
            <h2 className="font-semibold">Your latest checkout on this device</h2>
            <p className="mt-2 break-all text-sm text-muted-foreground">{recentCheckout.orderNumber}</p>
            <Link to={orderTrackingPath(recentCheckout.orderNumber, recentCheckout.trackingToken)} className="mt-3 inline-flex text-sm font-semibold text-red-500 underline underline-offset-4">View this order</Link>
          </section>}
          <form onSubmit={handleLookup} className="mb-8 space-y-5 rounded-xl border border-border bg-muted p-5 sm:p-7">
            <p className="text-sm text-muted-foreground">Enter the order number from your confirmation and the email used at checkout.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="tracking-order" className="mb-2 block text-sm font-medium">Order number</label>
                <input id="tracking-order" name="orderNumber" value={orderNumber} onChange={event => setOrderNumber(event.target.value)} required maxLength={80} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="tracking-email" className="mb-2 block text-sm font-medium">Checkout email</label>
                <input id="tracking-email" name="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} className={fieldClass} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600 disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Find my order</button>
          </form>
          {loading && <p role="status" className="mb-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Getting your latest order status…</p>}
          {error && <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-5"><p>{error}</p>{order && <p className="mt-2 text-sm">Your last loaded order details are shown below. We could not check for newer updates.</p>}{lookup && <button type="button" disabled={loading} onClick={() => setAttempt(current => current + 1)} className="mt-3 inline-flex items-center gap-2 font-semibold underline underline-offset-4 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Try again</button>}</div>}
          {order && (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  <p>Last order update: {formatOrderDate(order.updatedAt)}</p>
                  {lastChecked && <p className="mt-1">Last checked: {formatOrderDate(lastChecked)}</p>}
                  {autoRefresh && <p className="mt-1">Checks for updates every 30 seconds while this page is visible.</p>}
                </div>
                <button type="button" disabled={loading} onClick={() => setAttempt(current => current + 1)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-red-500 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh status</button>
              </div>
              <OrderDetails order={order} />
            </>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-5 text-sm font-semibold"><Link to="/" className="underline underline-offset-4">Back to Home</Link><Link to="/products" className="underline underline-offset-4">Continue Shopping</Link></div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
