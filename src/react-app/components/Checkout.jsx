import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { X, Truck, Shield, CreditCard, Loader2 } from "lucide-react";
import Navbar from "@/react-app/components/Navbar";
import Footer from "@/react-app/components/Footer";
import { useCart } from "@/react-app/contexts/CartContext";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_PROVINCE_OPTIONS,
  getShippingFee,
} from "@/react-app/config/shipping";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, removeFromCart, getItemCount, getTotal, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingProvince, setShippingProvince] = useState(SHIPPING_PROVINCE_OPTIONS[0].value);

  const subtotal = getTotal();
  const cartItemCount = getItemCount();
  const shippingFee = getShippingFee(subtotal, shippingProvince);
  const orderTotal = subtotal + shippingFee;

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      clearCart();
      setIsProcessing(false);
      navigate("/cart?success=true");
    }, 1500);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-muted border border-border rounded-xl p-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: "Anton, sans-serif" }}>
              CHECKOUT
            </h1>
            <p className="text-muted-foreground mb-8">
              Your cart is empty. Add items before proceeding to payment.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
            >
              Continue Shopping
            </Link>
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
          <h1 className="text-4xl sm:text-5xl font-bold mb-8" style={{ fontFamily: "Anton, sans-serif" }}>
            SECURE CHECKOUT
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-muted border border-border rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: "Anton, sans-serif" }}>
                    YOUR CART
                  </h2>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {cartItemCount} item{cartItemCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-4">
                  {items.map((item) => {
                    const unitPrice = parseFloat(item.price);
                    const lineTotal = unitPrice * item.quantity;

                    return (
                      <article key={item.id} className="border border-border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-full sm:w-28 h-40 sm:h-28 bg-background rounded-lg border border-border overflow-hidden flex-shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2" />
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <p className="text-xs uppercase text-red-500 mb-1">{item.category}</p>
                              <h3 className="font-semibold text-base sm:text-lg">{item.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-500 hover:text-red-400 text-sm font-medium flex items-center gap-1"
                              >
                                <X className="w-4 h-4" />
                                Remove
                              </button>
                              <p className="text-lg sm:text-xl font-bold">R{lineTotal.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="bg-muted border border-border rounded-xl p-4 sm:p-6">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "Anton, sans-serif" }}>
                  PAYMENT METHOD
                </h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Delivery Province</label>
                  <select
                    value={shippingProvince}
                    onChange={(event) => setShippingProvince(event.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none"
                  >
                    {SHIPPING_PROVINCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <button className="p-4 border border-border rounded-lg bg-background hover:border-red-500 transition flex items-center justify-center gap-3">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Card</span>
                  </button>
                  <button className="p-4 border border-border rounded-lg bg-background hover:border-red-500 transition flex items-center justify-center gap-3">
                    <div className="w-5 h-5 bg-yellow-500 rounded" />
                    <span className="font-medium">PayPal</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <section className="bg-muted border border-border rounded-xl p-4 sm:p-6">
                  <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "Anton, sans-serif" }}>
                    ORDER SUMMARY
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">R{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Shipping</span>
                      {shippingFee === 0 ? (
                        <span className="text-green-500 font-semibold">Free</span>
                      ) : (
                        <span className="text-green-500 font-semibold">R{shippingFee.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="h-px bg-border my-3" />
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total</span>
                      <div>
                        <span className="text-2xl sm:text-3xl font-bold">R{orderTotal.toFixed(2)}</span>
                        <p className="text-xs text-muted-foreground text-right">ZAR</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Free shipping applies when subtotal is above R{FREE_SHIPPING_THRESHOLD.toFixed(2)}.
                  </p>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Complete Purchase"
                    )}
                  </button>

                  <button
                    onClick={() => navigate("/products")}
                    className="w-full mt-4 text-sm sm:text-base text-muted-foreground hover:text-foreground transition"
                  >
                    &larr; Continue Shopping
                  </button>
                </section>

                <section className="bg-muted border border-border rounded-xl p-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-500/10 rounded-xl">
                        <Shield className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Secure Payment</h3>
                        <p className="text-sm text-muted-foreground">Your information is protected</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-xl">
                        <Truck className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Free Shipping</h3>
                        <p className="text-sm text-muted-foreground">On all orders over R2000</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold mb-2">Need Help?</h4>
                    <p className="text-sm text-muted-foreground mb-3">Contact support: support@necommerce.com</p>
                    <p className="text-xs text-muted-foreground">
                      By completing your purchase, you agree to our Terms of Service
                    </p>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-background border border-border rounded-xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
            <h3 className="text-lg font-bold mb-2">Processing Payment</h3>
            <p className="text-sm text-muted-foreground">Please wait while we secure your order...</p>
          </div>
        </div>
      )}
    </div>
  );
}
