import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import {
  addCartItem,
  changeCartItemSize,
  CART_STORAGE_KEY,
  deserializeCart,
  MAX_CART_QUANTITY,
  serializeCart,
  subtractPurchasedItems,
  type CartItem,
  type NewCartItem,
  type PurchasedCartItem,
} from '@/react-app/lib/cart-storage';
import type { ProductSize } from '@/shared/product-options';

export type { CartItem } from '@/react-app/lib/cart-storage';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: NewCartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateSize: (id: string, size: ProductSize) => void;
  clearCart: () => void;
  removePurchasedItems: (purchased: PurchasedCartItem[]) => void;
  getItemCount: () => number;
  getTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function loadCart(): CartItem[] {
  try {
    return deserializeCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const itemsRef = useRef(items);
  const hasUnsavedChanges = useRef(false);

  const changeCart = useCallback((update: (currentItems: CartItem[]) => CartItem[]) => {
    let currentItems = itemsRef.current;
    try {
      // Read the latest cart so a pending storage event from another tab cannot
      // make this tab overwrite its additions. Keep memory usable if blocked.
      if (!hasUnsavedChanges.current) {
        currentItems = deserializeCart(window.localStorage.getItem(CART_STORAGE_KEY));
      }
    } catch {
      // Persistent storage can be disabled by the browser.
    }
    const nextItems = update(currentItems);
    itemsRef.current = nextItems;
    try {
      // Write before navigation to Paystack, not in a later render effect.
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(nextItems));
      hasUnsavedChanges.current = false;
    } catch {
      // Keep this session usable if storage is full or unavailable.
      hasUnsavedChanges.current = true;
    }
    setItems(nextItems);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY && event.key !== null) return;
      if (hasUnsavedChanges.current) return;
      try {
        if (event.storageArea !== window.localStorage) return;
        const latestItems = deserializeCart(window.localStorage.getItem(CART_STORAGE_KEY));
        if (serializeCart(latestItems) === serializeCart(itemsRef.current)) return;
        itemsRef.current = latestItems;
        setItems(latestItems);
      } catch {
        // A privacy setting may disable storage while the page is open.
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addToCart = useCallback((item: NewCartItem) => {
    changeCart(currentItems => addCartItem(currentItems, item));
  }, [changeCart]);

  const removeFromCart = useCallback((id: string) => {
    changeCart(currentItems => currentItems.filter(item => item.id !== id));
  }, [changeCart]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (!Number.isInteger(quantity)) return;
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }
    changeCart(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity: Math.min(quantity, MAX_CART_QUANTITY) } : item
      )
    );
  }, [removeFromCart, changeCart]);

  const clearCart = useCallback(() => {
    changeCart(currentItems => currentItems.length ? [] : currentItems);
  }, [changeCart]);

  const updateSize = useCallback((id: string, size: ProductSize) => {
    changeCart(currentItems => changeCartItemSize(currentItems, id, size));
  }, [changeCart]);

  const removePurchasedItems = useCallback((purchased: PurchasedCartItem[]) => {
    changeCart(currentItems => subtractPurchasedItems(currentItems, purchased));
  }, [changeCart]);

  const getItemCount = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.price);
      return total + (price * item.quantity);
    }, 0);
  }, [items]);

  const value = useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateSize,
    clearCart,
    removePurchasedItems,
    getItemCount,
    getTotal,
  }), [items, addToCart, removeFromCart, updateQuantity, updateSize, clearCart, removePurchasedItems, getItemCount, getTotal]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
