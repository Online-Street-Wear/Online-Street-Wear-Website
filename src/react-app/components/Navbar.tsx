import { Menu, ShoppingBag, X, User, LogOut, Shield, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { useCart } from '@/react-app/contexts/CartContext';
import { useTheme } from '@/react-app/contexts/ThemeContext';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold tracking-tighter" style={{ fontFamily: 'Anton, sans-serif' }}>
              ONLINE<span className="text-red-500">.</span>
            </div>
            <div className="hidden sm:block text-xs text-gray-400 mt-1">EST. 2021</div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-white hover:text-red-500 transition">Home</Link>
            <Link to="/products" className="text-sm font-medium text-white hover:text-red-500 transition">All Products</Link>
            {isHome && <a href="#about" className="text-sm font-medium text-white hover:text-red-500 transition">About</a>}
            {isHome && <a href="#contact" className="text-sm font-medium text-white hover:text-red-500 transition">Contact</a>}
            
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <Link to="/cart" className="p-2 hover:bg-white/10 rounded-lg transition relative">
              <ShoppingBag className="w-5 h-5" />
              {getItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  {user.google_user_data.picture ? (
                    <img 
                      src={user.google_user_data.picture} 
                      alt={user.google_user_data.name || 'User'} 
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">{user.google_user_data.given_name || 'User'}</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-black/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-medium text-white">{user.google_user_data.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{user.email}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Shield className="w-3 h-3 text-purple-400" />
                        <span className="text-xs text-purple-400 uppercase font-semibold">{(user as any).role || 'User'}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-sm font-semibold transition-all"
              >
                Sign In
              </Link>
            )}
          </div>

          <button 
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-black border-t border-white/10">
          <div className="px-4 py-4 space-y-4">
            <Link to="/" className="block text-sm font-medium text-white hover:text-red-500 transition" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link to="/products" className="block text-sm font-medium text-white hover:text-red-500 transition" onClick={() => setIsMenuOpen(false)}>All Products</Link>
            {isHome && <a href="#about" className="block text-sm font-medium text-white hover:text-red-500 transition" onClick={() => setIsMenuOpen(false)}>About</a>}
            {isHome && <a href="#contact" className="block text-sm font-medium text-white hover:text-red-500 transition" onClick={() => setIsMenuOpen(false)}>Contact</a>}
            
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-sm font-medium text-white hover:text-red-500 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            
            {user ? (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg">
                  {user.google_user_data.picture ? (
                    <img 
                      src={user.google_user_data.picture} 
                      alt={user.google_user_data.name || 'User'} 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{user.google_user_data.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-purple-400 uppercase font-semibold">{(user as any).role || 'User'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-white hover:text-red-500 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-sm font-semibold text-center transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
