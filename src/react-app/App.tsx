import { BrowserRouter as Router, Routes, Route } from "react-router";
import { FirebaseAuthProvider } from "@/react-app/contexts/AuthContext";
import { CartProvider } from "@/react-app/contexts/CartContext";
import { ThemeProvider } from "@/react-app/contexts/ThemeContext";
import HomePage from "@/react-app/pages/Home";
import AllProducts from "@/react-app/pages/AllProducts";
import Cart from "@/react-app/pages/Cart";
import Login from "@/react-app/pages/Login";
import Checkout from "@/react-app/components/Checkout";


export default function App() {
  return (
    <ThemeProvider>
      <FirebaseAuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<AllProducts />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Router>
        </CartProvider>
      </FirebaseAuthProvider>
    </ThemeProvider>
  );
}
