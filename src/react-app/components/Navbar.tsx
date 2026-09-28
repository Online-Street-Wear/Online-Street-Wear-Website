import { Menu, ShoppingBag, X, User, LogOut, Sun, Moon, Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useCart } from '@/react-app/contexts/CartContext';
import { useSavedProducts } from '@/react-app/contexts/SavedProductsContext';
import { useTheme } from '@/react-app/contexts/ThemeContext';

const links = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Shop' },
  { to: '/track-order', label: 'Track Order' },
  { to: '/help', label: 'Shipping & Help' },
];
const iconClass = 'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const { savedIds } = useSavedProducts();
  const { theme, toggleTheme } = useTheme();
  const count = getItemCount();
  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Your account';

  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!isMenuOpen && !isUserMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setIsMenuOpen(false); setIsUserMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isUserMenuOpen) accountRef.current?.focus();
      else menuRef.current?.focus();
      setIsMenuOpen(false); setIsUserMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen, isUserMenuOpen]);

  async function handleLogout() {
    setLoggingOut(true); setLogoutError('');
    try { await logout(); setIsUserMenuOpen(false); navigate('/'); }
    catch { setLogoutError('We could not sign you out. Please try again.'); }
    finally { setLoggingOut(false); }
  }

  return <nav ref={navRef} aria-label="Main navigation" className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/95 text-white backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
      <Link to="/" aria-label="ONLINE Streetwear home" className="shrink-0 text-2xl font-bold tracking-tighter" style={{ fontFamily: 'Anton, sans-serif' }}>ONLINE<span className="text-red-500">.</span></Link>
      <div className="hidden items-center gap-5 lg:flex">
        {links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `rounded-sm py-2 text-sm font-medium transition hover:text-red-400 ${isActive ? 'text-red-400' : 'text-white'}`}>{link.label}</NavLink>)}
      </div>
      <div className="flex items-center gap-0 sm:gap-1">
        <button type="button" onClick={toggleTheme} className={`${iconClass} hidden sm:flex`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <Link to="/saved" className={iconClass} aria-label={`Saved picks, ${savedIds.length} items`}>
          <Heart className={`h-5 w-5 ${location.pathname === '/saved' ? 'fill-red-500 text-red-500' : ''}`} />
          {savedIds.length > 0 && <span aria-hidden="true" className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">{savedIds.length > 99 ? '99+' : savedIds.length}</span>}
        </Link>
        <Link to="/cart" className={iconClass} aria-label={`Shopping bag, ${count} items`}>
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && <span aria-hidden="true" className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">{count > 99 ? '99+' : count}</span>}
        </Link>
        {user ? <div className="relative">
          <button ref={accountRef} type="button" aria-label={`Account for ${displayName}`} aria-expanded={isUserMenuOpen} aria-controls="account-navigation"
            onClick={() => { setIsUserMenuOpen(current => !current); setIsMenuOpen(false); }} className={iconClass}>
            {user.photoURL ? <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" /> : <User className="h-5 w-5" />}
          </button>
          {isUserMenuOpen && <div id="account-navigation" className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-black p-4 shadow-2xl">
            <p className="break-words font-semibold">{displayName}</p>
            <p className="mt-1 break-all text-xs text-gray-400">{user.email}</p>
            <Link to="/saved" className="mt-4 block rounded-lg py-2 text-sm hover:text-red-400" onClick={() => setIsUserMenuOpen(false)}>Saved picks</Link>
            <Link to="/track-order" className="block rounded-lg py-2 text-sm hover:text-red-400" onClick={() => setIsUserMenuOpen(false)}>Track an order</Link>
            <button type="button" onClick={() => void handleLogout()} disabled={loggingOut} className="mt-3 flex w-full items-center gap-2 border-t border-white/10 pt-4 text-sm hover:text-red-400 disabled:opacity-50"><LogOut className="h-4 w-4" />{loggingOut ? 'Signing out…' : 'Sign out'}</button>
            {logoutError && <p role="alert" className="mt-3 text-sm text-red-400">{logoutError}</p>}
          </div>}
        </div> : <Link to="/login" className={iconClass} aria-label="Sign in"><User className="h-5 w-5" /><span className="sr-only">Sign in</span></Link>}
        <button ref={menuRef} type="button" className={`${iconClass} lg:hidden`} aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={isMenuOpen} aria-controls="mobile-navigation"
          onClick={() => { setIsMenuOpen(current => !current); setIsUserMenuOpen(false); }}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
    </div>
    {isMenuOpen && <div id="mobile-navigation" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-black px-4 py-4 lg:hidden">
      {links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `block rounded-lg px-3 py-3 text-sm font-medium ${isActive ? 'bg-red-500/10 text-red-400' : 'hover:bg-white/10'}`}>{link.label}</NavLink>)}
      <Link to="/saved" onClick={() => setIsMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm hover:bg-white/10">Saved picks ({savedIds.length})</Link>
      <button type="button" onClick={toggleTheme} className="mt-3 flex w-full items-center gap-3 border-t border-white/10 px-3 pt-5 text-sm">
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />} {theme === 'dark' ? 'Light' : 'Dark'} mode
      </button>
    </div>}
  </nav>;
}
