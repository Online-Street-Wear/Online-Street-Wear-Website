import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { parseSavedProducts, SAVED_PRODUCTS_KEY, toggleSavedProduct } from '@/react-app/lib/saved-products';

interface SavedProductsValue {
  savedIds: string[];
  toggle: (productId: string) => void;
  remove: (productIds: string[]) => void;
  storageAvailable: boolean;
}

const SavedProductsContext = createContext<SavedProductsValue | null>(null);

export function SavedProductsProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return parseSavedProducts(localStorage.getItem(SAVED_PRODUCTS_KEY)); }
    catch { return []; }
  });
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_PRODUCTS_KEY, JSON.stringify(savedIds));
      setStorageAvailable(true);
    } catch { setStorageAvailable(false); }
  }, [savedIds]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      try {
        if (event.storageArea === localStorage && (event.key === SAVED_PRODUCTS_KEY || event.key === null)) {
          setSavedIds(parseSavedProducts(event.newValue));
        }
      } catch { setStorageAvailable(false); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return <SavedProductsContext.Provider value={{ savedIds, storageAvailable,
    toggle: productId => setSavedIds(current => toggleSavedProduct(current, productId)),
    remove: productIds => setSavedIds(current => current.filter(id => !productIds.includes(id))),
  }}>{children}</SavedProductsContext.Provider>;
}

// The provider keeps saved items consistent across product cards and pages.
export function useSavedProducts() {
  const value = useContext(SavedProductsContext);
  if (!value) throw new Error('Saved products must be used inside their provider.');
  return value;
}
