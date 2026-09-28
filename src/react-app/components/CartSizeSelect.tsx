import { useId } from 'react';
import { PRODUCT_SIZES, isProductSize, type ProductSize } from '@/shared/product-options';

export default function CartSizeSelect({ size, productId, name, colour, disabled, onChange }: {
  size: ProductSize | ''; productId: string; name: string; colour: string; disabled?: boolean; onChange: (size: ProductSize) => void;
}) {
  const id = useId();
  return <div className="mt-3">
    <label htmlFor={id} className="mb-1 block text-sm font-medium">Size<span className="sr-only"> for {name}, {colour}</span></label>
    <select id={id} value={size} required disabled={disabled} data-cart-size data-cart-product={productId} data-cart-colour={colour.toLowerCase()}
      onChange={event => {
        const selectedSize = event.target.value;
        if (!isProductSize(selectedSize)) return;
        const originalSelect = event.currentTarget;
        onChange(selectedSize);
        // Size edits may merge rows or replace their payment-safe line ID.
        // Keep keyboard focus on the resulting variant after React renders it.
        requestAnimationFrame(() => {
          const target = originalSelect.isConnected ? originalSelect : Array.from(document.querySelectorAll<HTMLSelectElement>('select[data-cart-size]')).find(select =>
            select.dataset.cartProduct === productId && select.dataset.cartColour === colour.toLowerCase() && select.value === selectedSize);
          target?.focus({ preventScroll: true });
        });
      }}
      aria-describedby={!size ? `${id}-help` : undefined}
      className={`max-w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-red-500/40 ${size ? 'border-border' : 'border-red-500'}`}>
      <option value="" disabled>Choose a size</option>
      {PRODUCT_SIZES.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
    {!size && <p id={`${id}-help`} className="mt-1 text-xs text-red-500">Select a size before paying.</p>}
  </div>;
}
