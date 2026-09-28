export const PRODUCT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const

export type ProductSize = typeof PRODUCT_SIZES[number]

export function isProductSize(value: unknown): value is ProductSize {
  return typeof value === 'string' && PRODUCT_SIZES.some(size => size === value)
}
