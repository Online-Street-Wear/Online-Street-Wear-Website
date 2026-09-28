import { MAX_CART_ITEMS, MAX_CART_QUANTITY, MAX_COLOUR_LENGTH } from '../../shared/order-limits.ts';
import { isProductSize, type ProductSize } from '../../shared/product-options.ts';

export { MAX_CART_QUANTITY, MAX_COLOUR_LENGTH } from '../../shared/order-limits.ts';

export const CART_STORAGE_KEY = 'online-streetwear.cart.v1';
export const DEFAULT_COLOUR = 'As pictured';

export interface CartItem {
  id: string;
  productId: string;
  requestedColour: string;
  size: ProductSize | '';
  name: string;
  price: string;
  image: string;
  category: string;
  quantity: number;
}

export type NewCartItem = Omit<CartItem, 'id' | 'quantity' | 'size'> & { size: ProductSize };
export type PurchasedCartItem = Pick<CartItem, 'id' | 'quantity'>;

export function normaliseColour(colour: string): string {
  return colour.trim().replace(/\s+/g, ' ');
}

export function fallbackProductId(name: string): string {
  return `local-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 200 &&
    typeof item.productId === 'string' && item.productId.length > 0 && item.productId.length <= 200 &&
    typeof item.requestedColour === 'string' && normaliseColour(item.requestedColour).length > 0 && item.requestedColour.length <= MAX_COLOUR_LENGTH &&
    (item.size === undefined || item.size === '' || isProductSize(item.size)) &&
    typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 200 &&
    typeof item.price === 'string' && /^\d+(?:\.\d{1,2})?$/.test(item.price) && Number.isFinite(Number(item.price)) && Number(item.price) > 0 &&
    typeof item.image === 'string' && item.image.length <= 4096 &&
    typeof item.category === 'string' && item.category.length <= 200 &&
    typeof item.quantity === 'number' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= MAX_CART_QUANTITY
  );
}

export function deserializeCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== 'object') return [];
    const { version, items } = stored as Record<string, unknown>;
    if (version !== 1 || !Array.isArray(items)) return [];
    const seenIds = new Set<string>();
    return items.slice(0, MAX_CART_ITEMS).filter(isCartItem).filter(item => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    }).map(item => ({ ...item, requestedColour: normaliseColour(item.requestedColour), size: item.size || '' }));
  } catch {
    return [];
  }
}

export function serializeCart(items: CartItem[]): string {
  return JSON.stringify({ version: 1, items });
}

export function addCartItem(items: CartItem[], input: NewCartItem): CartItem[] {
  if (!isProductSize(input.size)) return items;
  const item: CartItem = {
    ...input,
    requestedColour: normaliseColour(input.requestedColour),
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    quantity: 1,
  };
  if (!isCartItem(item)) return items;
  const existing = items.find(current =>
    current.productId === item.productId &&
    current.size === item.size &&
    normaliseColour(current.requestedColour).toLowerCase() === item.requestedColour.toLowerCase()
  );
  if (existing) {
    if (existing.quantity >= MAX_CART_QUANTITY) return items;
    return items.map(current => current.id === existing.id ? { ...current, quantity: current.quantity + 1 } : current);
  }
  if (items.length >= MAX_CART_ITEMS) return items;
  return [...items, item];
}

export function changeCartItemSize(items: CartItem[], id: string, size: ProductSize): CartItem[] {
  if (!isProductSize(size)) return items;
  const item = items.find(current => current.id === id);
  if (!item || item.size === size) return items;
  const matching = items.find(current => current.id !== id && current.productId === item.productId
    && current.size === size && normaliseColour(current.requestedColour).toLowerCase() === normaliseColour(item.requestedColour).toLowerCase());
  if (matching && matching.quantity + item.quantity <= MAX_CART_QUANTITY) {
    return items.filter(current => current.id !== id).map(current =>
      current.id === matching.id ? { ...current, quantity: current.quantity + item.quantity } : current);
  }
  // A changed variant gets a new line ID so an earlier payment return cannot
  // remove this new selection. Keep both lines if merging would lose quantity.
  const newId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return items.map(current => current.id === id ? { ...current, id: newId, size } : current);
}

export function subtractPurchasedItems(items: CartItem[], purchased: PurchasedCartItem[]): CartItem[] {
  const quantities = new Map<string, number>();
  for (const item of purchased) {
    if (Number.isInteger(item.quantity) && item.quantity > 0) {
      quantities.set(item.id, (quantities.get(item.id) ?? 0) + item.quantity);
    }
  }
  if (!items.some(item => quantities.has(item.id))) return items;
  return items.flatMap(item => {
    const remaining = item.quantity - (quantities.get(item.id) ?? 0);
    return remaining > 0 ? [{ ...item, quantity: remaining }] : [];
  });
}
