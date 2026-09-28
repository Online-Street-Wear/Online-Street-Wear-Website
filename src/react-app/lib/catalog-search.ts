interface SearchableProduct {
  name: string;
  category: string;
  price: string;
}

export type ProductSort = 'featured' | 'price-low' | 'price-high' | 'name';

export function productSort(value: string | null): ProductSort {
  return value === 'price-low' || value === 'price-high' || value === 'name' ? value : 'featured';
}

export function filterProducts<T extends SearchableProduct>(
  products: readonly T[],
  query: string,
  category: string,
  sort: ProductSort,
): T[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = products.filter(product => {
    const searchable = `${product.name} ${product.category}`.toLocaleLowerCase();
    return (!category || product.category === category) && terms.every(term => searchable.includes(term));
  });

  if (sort === 'name') return matches.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'price-low' || sort === 'price-high') {
    const direction = sort === 'price-low' ? 1 : -1;
    return matches.sort((a, b) => direction * (Number(a.price) - Number(b.price)));
  }
  return matches;
}
