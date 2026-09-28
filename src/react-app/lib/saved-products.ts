export const SAVED_PRODUCTS_KEY = 'online-streetwear:saved-products';
export const MAX_SAVED_PRODUCTS = 200;

export function parseSavedProducts(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string =>
      typeof id === 'string' && id.length > 0 && id.length <= 150 && id === id.trim(),
    ))].slice(0, MAX_SAVED_PRODUCTS);
  } catch {
    return [];
  }
}

export function toggleSavedProduct(ids: string[], productId: string): string[] {
  if (!productId || productId.length > 150 || productId !== productId.trim()) return ids;
  if (ids.includes(productId)) return ids.filter(id => id !== productId);
  return [productId, ...ids].slice(0, MAX_SAVED_PRODUCTS);
}
