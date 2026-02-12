import { ShoppingBag, Trash2, Minus, Plus, Loader2, ArrowRight } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';
import { useCart } from '@/react-app/contexts/CartContext';
import { FREE_SHIPPING_THRESHOLD } from '@/react-app/config/shipping';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if returning from successful checkout
    if (searchParams.get('success') === 'true') {
      clearCart();
      setTimeout(() => {
        window.history.replaceState({}, '', '/cart');
      }, 100);
    }
    
    // Check for checkout error
    if (searchParams.get('error') === 'checkout_failed') {
      setErrorMessage('Failed to create checkout session. Please try again.');
      setTimeout(() => {
        window.history.replaceState({}, '', '/cart');
      }, 3000);
    }
  }, [searchParams, clearCart]);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setErrorMessage('');
    navigate('/checkout');
  };

  if (items.length === 0) {
    const wasSuccessful = searchParams.get('success') === 'true';
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        
        <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center" style={{ fontFamily: 'Anton, sans-serif' }}>
              YOUR CART
            </h1>

            {/* Empty Cart State */}
            <div className="text-center py-20">
              {wasSuccessful ? (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
                    <ShoppingBag className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Payment Successful!</h2>
                  <p className="text-muted-foreground mb-8">
                    Thank you for your order. We'll send you a confirmation email shortly.
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Your cart is empty</h2>
                  <p className="text-muted-foreground mb-8">
                    Looks like you haven't added anything to your cart yet.
                  </p>
                </>
              )}
              <Link 
                to="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-semibold rounded-lg hover:bg-red-500 hover:text-white transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
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
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {/* Product Image */}
                    <div className="w-full sm:w-32 h-48 sm:h-32 bg-background rounded-lg flex-shrink-0 border border-border">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-red-500 uppercase mb-1">{item.category}</p>
                        <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                        <p className="text-xl font-bold">R{item.price}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3 bg-background border border-border rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-muted rounded transition"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-muted rounded transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
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

                <div className="space-y-3 mb-6 pb-6 border-b border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">R{getTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-muted-foreground font-semibold">
                      Calculated at checkout (Free over R{FREE_SHIPPING_THRESHOLD.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-xl font-bold mb-2">
                  <span>Total</span>
                  <span>R{getTotal().toFixed(2)}</span>
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
                    Secure checkout • Free shipping • 30-day returns
                  </p>
                  
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
      </div>

      <Footer />
    </div>
  );
}
