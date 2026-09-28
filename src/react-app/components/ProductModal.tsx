import { X, ShoppingBag, Check, MapPin, Heart } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useCart } from '@/react-app/contexts/CartContext';
import { useSavedProducts } from '@/react-app/contexts/SavedProductsContext';
import { getAlternateStorageUrl } from '@/react-app/lib/assets';
import { DEFAULT_COLOUR, fallbackProductId, MAX_COLOUR_LENGTH, normaliseColour } from '@/react-app/lib/cart-storage';
import { PRODUCT_SIZES, type ProductSize } from '../../shared/product-options';

interface ProductModalProps {
  id?: string;
  image: string;
  name: string;
  price: string;
  category: string;
  onClose: () => void;
}

export default function ProductModal({ id, image, name, price, category, onClose }: ProductModalProps) {
  const { addToCart } = useCart();
  const { savedIds, toggle } = useSavedProducts();
  const productId = id || fallbackProductId(name);
  const saved = savedIds.includes(productId);
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState<ProductSize | ''>('');
  const [sizeError, setSizeError] = useState('');
  const [colourChoice, setColourChoice] = useState<'pictured' | 'custom'>('pictured');
  const [customColour, setCustomColour] = useState('');
  const [colourError, setColourError] = useState('');
  const colourInputId = useId();
  const titleId = useId();
  const sizeId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstSizeRef = useRef<HTMLButtonElement>(null);
  const colourInputRef = useRef<HTMLInputElement>(null);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const imageElement = event.currentTarget;
    if (imageElement.dataset.fallbackTried === "1") {
      return;
    }

    const currentSrc = imageElement.src;
    const alternateSrc = getAlternateStorageUrl(currentSrc);

    if (alternateSrc && currentSrc !== alternateSrc) {
      imageElement.dataset.fallbackTried = "1";
      imageElement.src = alternateSrc;
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
      ) || []).filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keepFocusInDialog);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keepFocusInDialog);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (colourChoice === 'custom') colourInputRef.current?.focus();
  }, [colourChoice]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(timer);
  }, [added]);

  const handleAddToCart = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!size) {
      setSizeError('Please choose your size before adding to your bag.');
      firstSizeRef.current?.focus();
      return;
    }
    const requestedColour = colourChoice === 'pictured' ? DEFAULT_COLOUR : normaliseColour(customColour);
    if (!requestedColour) {
      setColourError('Please enter the colour you would like.');
      colourInputRef.current?.focus();
      return;
    }
    addToCart({ productId: id || fallbackProductId(name), size, requestedColour, name, price, image, category });
    setColourError('');
    setAdded(true);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative bg-gray-900 text-white rounded-xl sm:rounded-2xl w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto shadow-2xl">
        <button
          type="button"
          aria-label="Close product details"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2.5 bg-black/75 hover:bg-black rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 items-start">
          {/* Image Section */}
          <div className="bg-gray-900 md:sticky md:top-0">
            <img 
              src={image} 
              alt={name}
              onError={handleImageError}
              className="block w-full h-auto max-h-[65dvh] md:max-h-[90dvh] object-contain"
            />
          </div>

          {/* Details Section */}
          <form noValidate onSubmit={handleAddToCart} className="p-5 sm:p-7 md:pt-8">
            <div>
              <p className="text-xs text-red-400 uppercase tracking-wider mb-2 md:pr-10">{category}</p>
              <h2 id={titleId} className="text-2xl sm:text-3xl font-bold mb-2 md:pr-6" style={{ fontFamily: 'Anton, sans-serif' }}>
                {name}
              </h2>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-2xl sm:text-3xl font-bold text-white">R{price}</p>
                <button type="button" aria-pressed={saved} onClick={() => toggle(productId)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm hover:border-red-400">
                  <Heart aria-hidden="true" className={`h-4 w-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} />{saved ? 'Saved' : 'Save for later'}
                </button>
              </div>

              <fieldset className="mb-6" aria-describedby={sizeError ? `${sizeId}-error` : undefined}>
                <legend className="text-sm font-semibold mb-3">Choose your size <span className="text-gray-400 font-normal">(required)</span></legend>
                <div className="grid grid-cols-5 gap-2">
                  {PRODUCT_SIZES.map((option, index) => (
                    <button
                      key={option}
                      ref={index === 0 ? firstSizeRef : undefined}
                      type="button"
                      aria-label={`Size ${option}`}
                      aria-pressed={size === option}
                      onClick={() => { setSize(option); setSizeError(''); setAdded(false); }}
                      className={`min-h-11 rounded-lg border text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${size === option ? 'bg-red-500 border-red-500 text-white' : 'border-gray-600 hover:border-gray-300 bg-gray-800 text-white'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {sizeError && <p id={`${sizeId}-error`} role="alert" className="mt-2 text-sm text-red-400">{sizeError}</p>}
              </fieldset>

              <fieldset className="mb-6 space-y-3 rounded-lg border border-gray-700 p-4">
                <legend className="px-1 text-sm font-semibold">Choose a colour</legend>
                <p className="text-sm text-gray-400">Like this piece in another colour? Add your preference below.</p>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={colourInputId}
                    checked={colourChoice === 'pictured'}
                    onChange={() => { setColourChoice('pictured'); setColourError(''); setAdded(false); }}
                    className="accent-red-500"
                  />
                  As pictured
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={colourInputId}
                    checked={colourChoice === 'custom'}
                    onChange={() => { setColourChoice('custom'); setAdded(false); }}
                    className="accent-red-500"
                  />
                  Request another colour
                </label>
                {colourChoice === 'custom' && (
                  <div className="space-y-2">
                    <label htmlFor={colourInputId} className="block text-sm font-medium">Your preferred colour</label>
                    <input
                      id={colourInputId}
                      ref={colourInputRef}
                      type="text"
                      value={customColour}
                      onChange={event => { setCustomColour(event.target.value); setColourError(''); setAdded(false); }}
                      required
                      maxLength={MAX_COLOUR_LENGTH}
                      placeholder="e.g. navy blue"
                      aria-invalid={Boolean(colourError)}
                      aria-describedby={`${colourInputId}-help${colourError ? ` ${colourInputId}-error` : ''}`}
                      className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <p id={`${colourInputId}-help`} className="text-xs text-gray-400">Your colour request will be included in your cart and order.</p>
                    {colourError && <p id={`${colourInputId}-error`} role="alert" className="text-sm text-red-400">{colourError}</p>}
                  </div>
                )}
              </fieldset>

              <p className="flex items-start gap-2 text-xs text-gray-400 mb-5">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                Collect with PAXI. Choose your collection point at checkout.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                type="submit"
                className={`w-full ${added ? 'bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white font-semibold py-3.5 px-4 rounded-lg transition flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
              >
                {added ? <Check className="w-5 h-5" aria-hidden="true" /> : <ShoppingBag className="w-5 h-5" aria-hidden="true" />}
                <span aria-live="polite">{added ? 'Added to Cart!' : 'Add to Cart'}</span>
              </button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button type="button" onClick={onClose} className="py-2 text-gray-300 hover:text-white underline underline-offset-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400">
                  Continue Shopping
                </button>
                <Link to="/cart" onClick={onClose} className="py-2 text-white font-semibold underline underline-offset-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400">
                  View bag
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
