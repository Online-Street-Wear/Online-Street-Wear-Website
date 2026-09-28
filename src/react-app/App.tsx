import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router";
import { useEffect } from "react";
import { FirebaseAuthProvider } from "@/react-app/contexts/AuthContext";
import { CartProvider } from "@/react-app/contexts/CartContext";
import { ThemeProvider } from "@/react-app/contexts/ThemeContext";
import { SavedProductsProvider } from "@/react-app/contexts/SavedProductsContext";
import HomePage from "@/react-app/pages/Home";
import AllProducts from "@/react-app/pages/AllProducts";
import Cart from "@/react-app/pages/Cart";
import Login from "@/react-app/pages/Login";
import Checkout from "@/react-app/components/Checkout";
import OrderConfirmation from "@/react-app/pages/OrderConfirmation";
import TrackOrder from "@/react-app/pages/TrackOrder";
import ManageOrders from "@/react-app/pages/ManageOrders";
import SavedProducts from "@/react-app/pages/SavedProducts";
import Help from "@/react-app/pages/Help";
import NotFound from "@/react-app/pages/NotFound";

const pageTitles: Record<string, string> = {
  '/': 'Streetwear', '/products': 'Shop the collection', '/saved': 'Saved picks',
  '/help': 'Shipping & Help', '/cart': 'Your bag', '/checkout': 'Checkout',
  '/order-confirmation': 'Order confirmation', '/track-order': 'Track your order',
  '/manage-orders': 'Manage orders', '/login': 'Sign in',
};

function ScrollToPageTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title = `${pageTitles[pathname] || 'Page not found'} | ONLINE Streetwear`;
    const frame = window.requestAnimationFrame(() => {
      let target: HTMLElement | null = null;
      try { target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch { /* Ignore malformed fragments. */ }
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <FirebaseAuthProvider>
        <CartProvider>
          <SavedProductsProvider>
          <Router>
            <ScrollToPageTop />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<AllProducts />} />
              <Route path="/saved" element={<SavedProducts />} />
              <Route path="/help" element={<Help />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/track-order" element={<TrackOrder />} />
              <Route path="/manage-orders" element={<ManageOrders />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          </SavedProductsProvider>
        </CartProvider>
      </FirebaseAuthProvider>
    </ThemeProvider>
  );
}
