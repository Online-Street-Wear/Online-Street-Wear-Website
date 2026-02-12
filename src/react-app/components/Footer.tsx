import { Instagram, Twitter, Facebook } from 'lucide-react';
export default function Footer() {
  return <footer className="bg-black border-t border-white/10 py-12">
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
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">New Arrivals</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Collections</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Sale</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">About</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Our Story</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Sustainability</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/onliine_78?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 hover:bg-red-500 rounded-lg transition">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 hover:bg-red-500 rounded-lg transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/groups/1441621759504684/" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 hover:bg-red-500 rounded-lg transition">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <p className="text-center text-sm text-gray-400">© 2021 Online Streetwear. All rights reserved.</p>
        </div>
      </div>
    </footer>;
}