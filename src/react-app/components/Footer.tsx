import { Instagram, Facebook } from 'lucide-react';
import { Link } from 'react-router';
export default function Footer() {
  return <footer className="bg-black text-white border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="text-3xl font-bold tracking-tighter" style={{
            fontFamily: 'Anton, sans-serif'
          }}>
              ONLINE<span className="text-red-500">.</span>
            </div>
            <p className="text-sm text-gray-400">
              Redefining urban fashion since 2021
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Shop</h4>
            <ul className="space-y-2">
              <li><Link to="/products" className="text-sm text-gray-400 hover:text-white transition">All Products</Link></li>
              <li><Link to="/saved" className="text-sm text-gray-400 hover:text-white transition">Saved Pieces</Link></li>
              <li><Link to="/track-order" className="text-sm text-gray-400 hover:text-white transition">Track Order</Link></li>
              <li><Link to="/" className="text-sm text-gray-400 hover:text-white transition">Home</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">About</h4>
            <ul className="space-y-2">
              <li><a href="/#about" className="text-sm text-gray-400 hover:text-white transition">Our Story</a></li>
              <li><Link to="/help" className="text-sm text-gray-400 hover:text-white transition">Shipping &amp; Help</Link></li>
              <li><a href="/#contact" className="text-sm text-gray-400 hover:text-white transition">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/onliine_78/" target="_blank" rel="noopener noreferrer" aria-label="ONLINE on Instagram (opens in a new tab)" className="p-3 bg-white/10 hover:bg-red-500 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500">
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </a>
              <a href="https://www.facebook.com/groups/1441621759504684/" target="_blank" rel="noopener noreferrer" aria-label="ONLINE Facebook community (opens in a new tab)" className="p-3 bg-white/10 hover:bg-red-500 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500">
                <Facebook className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <p className="text-center text-sm text-gray-400">© {new Date().getFullYear()} Online Streetwear. All rights reserved.</p>
        </div>
      </div>
    </footer>;
}
