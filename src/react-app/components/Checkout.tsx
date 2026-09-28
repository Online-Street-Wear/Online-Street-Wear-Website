import { useEffect, useRef, useState, type FormEvent, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { CreditCard, ExternalLink, Loader2, MapPin, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useCart } from '@/react-app/contexts/CartContext';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';
import { getAlternateStorageUrl } from '@/react-app/lib/assets';
import { createPayment, savePendingPayment } from '@/react-app/lib/orders';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_PROVINCE_OPTIONS, getShippingFee, type ShippingProvince } from '@/react-app/config/shipping';
import { MAX_ORDER_QUANTITY } from '@/shared/order-limits';
import { isProductSize } from '@/shared/product-options';
import CartSizeSelect from '@/react-app/components/CartSizeSelect';

const inputClass = 'w-full rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30';

export default function Checkout() {
  const { user } = useAuth();
  const { items, removeFromCart, updateSize, getItemCount, getTotal } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingProvince, setShippingProvince] = useState<ShippingProvince>(SHIPPING_PROVINCE_OPTIONS[0].value);
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [paxiPointCode, setPaxiPointCode] = useState('');
  const [paxiPointName, setPaxiPointName] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (user?.email) setEmail(current => current || user.email || '');
    if (user?.displayName) setFullName(current => current || user.displayName || '');
  }, [user?.email, user?.displayName]);

  const subtotal = getTotal();
  const shippingFee = getShippingFee(subtotal, shippingProvince);
  const orderTotal = subtotal + shippingFee;

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const alternate = getAlternateStorageUrl(image.src);
    if (alternate && image.dataset.fallbackTried !== '1' && alternate !== image.src) {
      image.dataset.fallbackTried = '1';
      image.src = alternate;
    }
  };

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.current || !items.length) return;
    if (getItemCount() > MAX_ORDER_QUANTITY) {
      setPaymentError(`Online checkout supports up to ${MAX_ORDER_QUANTITY} items. Please reduce the quantity or contact the store for a bulk order.`);
      return;
    }
    if (![email, fullName, phone, paxiPointCode, paxiPointName].every(value => value.trim())) {
      setPaymentError('Complete your contact details and chosen PAXI collection point.');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPaymentError('');
    setIsProcessing(true);
    const purchasedItems = items.map(({ id, quantity }) => ({ id, quantity }));
    try {
      const payment = await createPayment({
        email: email.trim(),
        shippingProvince,
        shippingAddress: { fullName: fullName.trim(), phone: phone.trim(), paxiPointCode: paxiPointCode.trim().toUpperCase(), paxiPointName: paxiPointName.trim() },
        items: items.map(({ productId, quantity, requestedColour, size }) => {
          if (!isProductSize(size)) throw new Error('Choose a size for each item before paying.');
          return { productId, quantity, requestedColour, size };
        }),
        site_url: window.location.origin,
      }, controller.signal);
      if (controller.signal.aborted) return;
      savePendingPayment({ reference: payment.reference, orderNumber: payment.orderNumber, trackingToken: payment.trackingToken, purchasedItems });
      window.location.assign(payment.authorization_url);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPaymentError(error instanceof Error ? error.message : 'Could not start Paystack checkout. Please try again.');
      setIsProcessing(false);
    } finally {
      if (request.current === controller) request.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'Anton, sans-serif' }}>SECURE CHECKOUT</h1>
          {!items.length ? (
            <section className="rounded-xl border border-border bg-muted p-8 text-center">
              <p className="mb-6 text-muted-foreground">Your cart is empty. Add your favourite items before checking out.</p>
              <Link to="/products" className="inline-flex rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600">Continue Shopping</Link>
              <Link to="/" className="mt-4 block underline underline-offset-4">Back to Home</Link>
            </section>
          ) : (
            <form onSubmit={handleCheckout} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-xl border border-border bg-muted p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold">Your cart</h2>
                    <span className="text-sm text-muted-foreground">{getItemCount()} item{getItemCount() === 1 ? '' : 's'}</span>
                  </div>
                  <ul className="space-y-4">
                    {items.map(item => (
                      <li key={item.id} className="flex items-start gap-4 rounded-lg border border-border p-4">
                        <img src={item.image} onError={handleImageError} alt={item.name} className="h-auto max-h-36 w-20 shrink-0 self-start rounded-lg object-contain sm:w-24" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="mt-1 break-words text-sm text-muted-foreground">Colour: {item.requestedColour || 'As pictured'}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                          <CartSizeSelect size={item.size} productId={item.productId} name={item.name} colour={item.requestedColour} disabled={isProcessing} onChange={size => updateSize(item.id, size)} />
                          <p className="mt-2 font-bold">R{(Number(item.price) * item.quantity).toFixed(2)}</p>
                        </div>
                        <button type="button" disabled={isProcessing} onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}, ${item.requestedColour}, size ${item.size || 'not selected'}`} className="rounded p-1 text-red-500 hover:bg-red-500/10 disabled:opacity-50"><X className="h-5 w-5" /></button>
                      </li>
                    ))}
                  </ul>
                </section>

                <fieldset disabled={isProcessing} className="space-y-5 rounded-xl border border-border bg-muted p-5 sm:p-6">
                  <legend className="sr-only">Contact and PAXI collection details</legend>
                  <h2 className="text-2xl font-bold">Contact details</h2>
                  <div>
                    <label htmlFor="checkout-name" className="mb-2 block text-sm font-medium">Recipient full name</label>
                    <input id="checkout-name" name="fullName" autoComplete="name" required maxLength={100} value={fullName} onChange={event => setFullName(event.target.value)} className={inputClass} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="checkout-email" className="mb-2 block text-sm font-medium">Email address</label>
                      <input id="checkout-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} aria-describedby="checkout-email-help" className={inputClass} />
                      <p id="checkout-email-help" className="mt-2 text-xs text-muted-foreground">Your confirmation, tracking link and PAXI arrival updates go to this email. Check it carefully before paying.</p>
                    </div>
                    <div>
                      <label htmlFor="checkout-phone" className="mb-2 block text-sm font-medium">Recipient mobile number</label>
                      <input id="checkout-phone" name="phone" type="tel" autoComplete="tel" required maxLength={24} value={phone} onChange={event => setPhone(event.target.value)} placeholder="e.g. 082 123 4567" className={inputClass} />
                      <p className="mt-2 text-xs text-muted-foreground">PAXI uses this mobile number for its collection SMS and PIN.</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <h2 className="flex items-center gap-2 text-2xl font-bold"><MapPin className="h-6 w-6 text-red-500" /> PAXI collection at PEP</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Choose a PEP/PAXI point where you would like to collect your parcel, then enter its point code and store name below.</p>
                    <a href="https://map.paxi.co.za" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold hover:border-red-500">Find a PAXI collection point <ExternalLink className="h-4 w-4" /></a>
                  </div>
                  <div>
                    <label htmlFor="checkout-province" className="mb-2 block text-sm font-medium">Collection point province</label>
                    <select id="checkout-province" name="shippingProvince" value={shippingProvince} onChange={event => setShippingProvince(event.target.value as ShippingProvince)} className={inputClass}>
                      {SHIPPING_PROVINCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="checkout-paxi-code" className="mb-2 block text-sm font-medium">PAXI point code</label>
                      <input id="checkout-paxi-code" name="paxiPointCode" required minLength={3} maxLength={20} pattern={'[A-Za-z0-9\\-]{3,20}'} title="Enter the point code from the PAXI locator, using letters, numbers or hyphens." value={paxiPointCode} onChange={event => setPaxiPointCode(event.target.value)} placeholder="Code shown in the locator" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="checkout-paxi-name" className="mb-2 block text-sm font-medium">PEP / collection point name</label>
                      <input id="checkout-paxi-name" name="paxiPointName" required maxLength={160} value={paxiPointName} onChange={event => setPaxiPointName(event.target.value)} placeholder="Store name shown in the locator" className={inputClass} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Please check your selected point and mobile number before paying. Your order page will show progress and your PAXI parcel number after dispatch.</p>
                </fieldset>
              </div>

              <aside>
                <section className="rounded-xl border border-border bg-muted p-5 sm:p-6 lg:sticky lg:top-24">
                  <h2 className="mb-6 text-2xl font-bold">Order summary</h2>
                  <dl className="space-y-4">
                    <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd className="font-semibold">R{subtotal.toFixed(2)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>PAXI delivery</dt><dd className="font-semibold">{shippingFee === 0 ? 'Free' : `R${shippingFee.toFixed(2)}`}</dd></div>
                    <div className="flex justify-between gap-4 border-t border-border pt-5 text-xl font-bold"><dt>Total</dt><dd>R{orderTotal.toFixed(2)}</dd></div>
                  </dl>
                  <p className="mt-2 text-right text-xs text-muted-foreground">ZAR</p>
                  <p className="my-5 text-sm text-muted-foreground">Free delivery on orders over R{FREE_SHIPPING_THRESHOLD.toFixed(2)}.</p>
                  <button type="submit" disabled={isProcessing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-5 py-4 font-semibold text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-60">
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                    {isProcessing ? 'Opening Paystack…' : 'Pay with Paystack'}
                  </button>
                  {paymentError && <p role="alert" className="mt-4 text-sm text-red-500">{paymentError}</p>}
                  <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /> Secure payment through Paystack</p>
                  <Link to="/products" className="mt-6 block py-2 text-center font-medium hover:underline">Continue Shopping</Link>
                  <Link to="/" className="mt-1 block py-2 text-center text-sm text-muted-foreground hover:underline">Back to Home</Link>
                </section>
              </aside>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
