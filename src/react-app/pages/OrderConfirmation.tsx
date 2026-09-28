import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, CircleAlert, Loader2, Package, RefreshCw } from 'lucide-react';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';
import OrderDetails from '@/react-app/components/OrderDetails';
import { useCart } from '@/react-app/contexts/CartContext';
import { claimPurchasedItems, getPendingPayment, orderTrackingPath, verifyPayment, type VerifyPaymentResult } from '@/react-app/lib/orders';

export default function OrderConfirmation() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const token = params.get('token') || (reference ? getPendingPayment(reference)?.trackingToken : '') || '';
  const { removePurchasedItems } = useCart();
  const [result, setResult] = useState<VerifyPaymentResult | null>(null);
  const [error, setError] = useState('');
  const [cartWarning, setCartWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    setCartWarning('');
    if (!reference || !token) {
      setError('This payment return link is missing order details. Look up your order using your order number and checkout email, or return to your cart.');
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    verifyPayment(reference, token, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      if (response.paid && response.order.paymentStatus === 'paid') {
        try {
          const purchased = claimPurchasedItems(reference);
          if (purchased.length) removePurchasedItems(purchased);
        } catch {
          setCartWarning('Your payment is confirmed. We could not update this browser’s saved cart; review it before placing another order.');
        }
      }
      setResult(response);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'We could not verify this payment. Please try again.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [reference, token, attempt, removePurchasedItems]);

  const paid = result?.paid === true && result.order.paymentStatus === 'paid';
  const order = result?.order;
  const emailMessage = order?.emailStatus === 'sent'
    ? 'Your confirmation email has been submitted for delivery. Check your inbox or spam folder for your order number and tracking link.'
    : order?.emailStatus === 'pending'
      ? 'Your confirmation email is being prepared. Save your order number below so you can track your order.'
      : 'Your order is confirmed, but the confirmation email has not been sent. Save your order number and use Track Order for updates.';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="mb-8 rounded-xl border border-border bg-muted p-6 text-center sm:p-10" aria-live="polite">
            <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${paid ? 'bg-green-500/15 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
              {loading ? <Loader2 className="h-10 w-10 animate-spin" /> : paid ? <CheckCircle2 className="h-10 w-10" /> : <CircleAlert className="h-10 w-10" />}
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">{loading ? 'Confirming your payment…' : paid ? 'Payment successful!' : error ? 'We could not confirm your payment' : 'Payment not confirmed yet'}</h1>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {loading ? 'Please wait while we check your transaction with Paystack.' : paid ? emailMessage : error || `Your payment status is ${result?.paymentStatus || 'pending'}. If you just completed payment, check again before starting a new checkout.`}
            </p>
            {cartWarning && <p role="status" className="mt-4 text-sm text-muted-foreground">{cartWarning}</p>}
            {paid && order && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground">Your order number</p>
                <p className="mt-1 break-all text-2xl font-bold">{order.orderNumber}</p>
                <Link to={orderTrackingPath(order.orderNumber, token)} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600"><Package className="h-5 w-5" /> Track Order</Link>
                <p className="mt-4 text-sm text-muted-foreground">Your tracking page shows dispatch, arrival at your selected PAXI point and collection. Keep this link to check for updates.</p>
              </div>
            )}
            {!loading && !paid && reference && token && <button type="button" onClick={() => setAttempt(current => current + 1)} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-3 font-semibold hover:border-red-500"><RefreshCw className="h-4 w-4" /> Check payment again</button>}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="inline-flex rounded-lg bg-foreground px-6 py-3 font-semibold text-background hover:bg-red-500 hover:text-white">Back to Home</Link>
              <Link to="/products" className="inline-flex rounded-lg border border-border bg-background px-6 py-3 font-semibold hover:border-red-500">Continue Shopping</Link>
            </div>
            {!paid && !loading && <div className="mt-5 flex flex-wrap justify-center gap-6 text-sm"><Link to="/track-order" className="underline underline-offset-4">Look up an order</Link><Link to="/cart" className="underline underline-offset-4">Return to cart</Link></div>}
          </section>
          {order && !loading && <OrderDetails order={order} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
