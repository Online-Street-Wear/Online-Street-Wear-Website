import { ShoppingBag, Trash2, Minus, Plus, Loader2, Truck, Check } from 'lucide-react';
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router';
import { useState } from 'react';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';
import { useCart } from '@/react-app/contexts/CartContext';
import { FREE_SHIPPING_THRESHOLD, getShippingFee, SHIPPING_PROVINCE_OPTIONS, type ShippingProvince } from '@/react-app/config/shipping';
import { getAlternateStorageUrl } from '@/react-app/lib/assets';
import CartSizeSelect from '@/react-app/components/CartSizeSelect';
import { MAX_CART_QUANTITY } from '@/react-app/lib/cart-storage';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, updateSize, getTotal } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryProvince, setDeliveryProvince] = useState<ShippingProvince | ''>('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subtotalCents = Math.round(getTotal() * 100);
  const subtotal = subtotalCents / 100;
  const freeDeliveryMinimumCents = Math.round(FREE_SHIPPING_THRESHOLD * 100) + 1;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryMinimumCents - subtotalCents) / 100;
  const hasFreeDelivery = subtotalCents >= freeDeliveryMinimumCents;
  const shippingEstimate = hasFreeDelivery ? 0 : deliveryProvince ? getShippingFee(subtotal, deliveryProvince) : null;
  const estimatedTotal = shippingEstimate === null ? subtotal : (subtotalCents + Math.round(shippingEstimate * 100)) / 100;

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const imageElement = event.currentTarget;
    if (imageElement.dataset.fallbackTried === '1') {
      return;
    }

    const currentSrc = imageElement.src;
    const alternateSrc = getAlternateStorageUrl(currentSrc);

    if (alternateSrc && currentSrc !== alternateSrc) {
      imageElement.dataset.fallbackTried = '1';
      imageElement.src = alternateSrc;
    }
  };

  const errorMessage = searchParams.get('canceled') === 'true'
    ? 'Payment was canceled. Your cart is saved, and you can try again.'
    : searchParams.get('error') === 'checkout_failed'
      ? 'Checkout could not be started. Please try again.'
      : '';

  // Preserve old Paystack return links while all confirmation goes through verification.
  if (searchParams.has('reference') || searchParams.has('trxref') || searchParams.get('success') === 'true') {
    const params = new URLSearchParams(searchParams);
    if (!params.has('reference') && params.has('trxref')) params.set('reference', params.get('trxref')!);
    params.delete('success');
    return <Navigate to={`/order-confirmation?${params.toString()}`} replace />;
  }

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    navigate('/checkout');
  };

  if (items.length === 0) {
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        
        <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center" style={{ fontFamily: 'Anton, sans-serif' }}>
              YOUR CART
            </h1>

            {errorMessage && <p role="status" className="text-center text-red-500 mb-4">{errorMessage}</p>}
            {/* Empty Cart State */}
            <div className="text-center py-20">

                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Your cart is empty</h2>
                  <p className="text-muted-foreground mb-8">
                    Looks like you haven't added anything to your cart yet.
                  </p>
                </>

              <Link 
                to="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-semibold rounded-lg hover:bg-red-500 hover:text-white transition"
              >
                Continue Shopping
              </Link>
              <Link to="/" className="block mt-4 text-sm underline underline-offset-4">Back to Home</Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center sm:text-left" style={{ fontFamily: 'Anton, sans-serif' }}>
            YOUR CART
          </h1>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-500">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                You can try again or use our secure checkout page.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-muted rounded-lg overflow-hidden border border-border"
                >
                  <div className="flex items-start gap-3 sm:gap-4 p-4">
                    {/* Product Image */}
                    <div className="w-20 sm:w-32 self-start overflow-hidden rounded-lg flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        onError={handleImageError}
                        className="w-full h-auto max-h-48 object-contain"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-red-500 uppercase mb-1">{item.category}</p>
                        <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">Colour: {item.requestedColour || 'As pictured'}</p>
                        <CartSizeSelect size={item.size} productId={item.productId} name={item.name} colour={item.requestedColour} onChange={size => updateSize(item.id, size)} />
                        <p className="mt-3 text-xl font-bold">R{item.price}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                        <div className="flex items-center gap-3 bg-background border border-border rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.name}, size ${item.size || 'not selected'}`}
                            className="p-2 hover:bg-muted rounded transition"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label={`Increase quantity of ${item.name}, size ${item.size || 'not selected'}`}
                            disabled={item.quantity >= MAX_CART_QUANTITY}
                            className="p-2 hover:bg-muted rounded transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.name}, ${item.requestedColour}, size ${item.size || 'not selected'}`}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-muted border border-border rounded-lg p-6 sticky top-24">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Anton, sans-serif' }}>
                  ORDER SUMMARY
                </h2>

                <div className="mb-6 rounded-xl border border-border bg-background p-4">
                  <p role="status" className="mb-3 flex items-start gap-2 text-sm font-medium">
                    {hasFreeDelivery ? <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> : <Truck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                    <span>{hasFreeDelivery ? 'Your bag qualifies for free delivery.' : `Add R${remainingForFreeDelivery.toFixed(2)} for free delivery.`}</span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label="Progress towards free delivery"
                    aria-valuemin={0}
                    aria-valuemax={freeDeliveryMinimumCents / 100}
                    aria-valuenow={Math.min(subtotalCents, freeDeliveryMinimumCents) / 100}
                    aria-valuetext={hasFreeDelivery ? 'Free delivery unlocked' : `R${remainingForFreeDelivery.toFixed(2)} more for free delivery`}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div className={`h-full rounded-full transition-[width] ${hasFreeDelivery ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, subtotalCents / freeDeliveryMinimumCents * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Free PAXI delivery on orders over R{FREE_SHIPPING_THRESHOLD.toFixed(2)}.</p>
                </div>

                <div className="mb-6">
                  <label htmlFor="delivery-estimate-province" className="mb-2 block text-sm font-medium">Estimate delivery to your province</label>
                  <select
                    id="delivery-estimate-province"
                    value={deliveryProvince}
                    onChange={event => setDeliveryProvince(event.target.value as ShippingProvince | '')}
                    aria-describedby="delivery-estimate-help"
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">Choose a province</option>
                    {SHIPPING_PROVINCE_OPTIONS.map(province => <option key={province.value} value={province.value}>{province.label}</option>)}
                  </select>
                  <p id="delivery-estimate-help" className="mt-2 text-xs text-muted-foreground">Choose your province and PAXI collection point at checkout to confirm the delivery fee.</p>
                </div>

                <div className="space-y-3 mb-6 pb-6 border-b border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">R{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Delivery estimate</span>
                    <span className="text-muted-foreground font-semibold text-right">
                      {shippingEstimate === null ? 'Select a province' : shippingEstimate === 0 ? 'Free' : `R${shippingEstimate.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div aria-live="polite" aria-atomic="true" className="flex justify-between gap-3 text-xl font-bold mb-2">
                  <span>{shippingEstimate === null ? 'Total before delivery' : 'Estimated total'}</span>
                  <span className="whitespace-nowrap">R{estimatedTotal.toFixed(2)}</span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6 text-right">ZAR</p>

                <button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition mb-3 flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      Proceed to Checkout
                    </>
                  )}
                </button>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3 text-center">
                    Secure Paystack checkout · PAXI collection at PEP
                  </p>
                  <Link to="/help#delivery" className="mb-2 block text-center text-sm underline underline-offset-4 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">How delivery and collection work</Link>
                  
                  <Link
                    to="/products"
                    className="block text-center text-sm text-muted-foreground hover:text-foreground transition py-2"
                  >
                    ← Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
