import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import Navbar from '@/react-app/components/Navbar';
import ProductCard from '@/react-app/components/ProductCard';
import ProductModal from '@/react-app/components/ProductModal';
import Footer from '@/react-app/components/Footer';
import { Product } from '@/react-app/data/products';
import { useProducts } from '@/react-app/hooks/useProducts';
import { filterProducts, productSort } from '@/react-app/lib/catalog-search';

export default function AllProducts() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { products, loading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = productSort(searchParams.get('sort'));
  const categories = useMemo(() => [...new Set(products.map(product => product.category))].sort(), [products]);
  const visibleProducts = useMemo(() => filterProducts(products, query, category, sort), [products, query, category, sort]);
  const hasFilters = Boolean(query || category || searchParams.get('sort'));

  function setFilter(key: string, value: string) {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (value && !(key === 'sort' && value === 'featured')) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  function clearFilters() {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      ['q', 'category', 'sort'].forEach(key => next.delete(key));
      return next;
    }, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 sm:mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Find your next favourite</p>
            <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-6xl" style={{ fontFamily: 'Anton, sans-serif' }}>ALL PRODUCTS</h1>
            <p className="max-w-2xl text-muted-foreground">Explore the collection, choose your size and request the colour you want.</p>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-muted p-4 sm:p-5" role="search" aria-label="Find products">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_210px]">
              <div>
                <label htmlFor="product-search" className="mb-2 block text-sm font-medium">Search products</label>
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="product-search"
                    type="search"
                    value={query}
                    onChange={event => setFilter('q', event.target.value)}
                    placeholder="Search by name or category"
                    className="min-h-11 w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="product-category" className="mb-2 block text-sm font-medium">Category</label>
                <select id="product-category" value={category} onChange={event => setFilter('category', event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500">
                  <option value="">All categories</option>
                  {category && !categories.includes(category) && <option value={category}>{category}</option>}
                  {categories.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="product-sort" className="mb-2 block text-sm font-medium">Sort by</label>
                <select id="product-sort" value={sort} onChange={event => setFilter('sort', event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500">
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-5 flex min-h-9 flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm text-muted-foreground">
              {loading && products.length === 0 ? 'Loading products…' : `${visibleProducts.length} of ${products.length} products`}
            </p>
            {hasFilters && <button type="button" onClick={clearFilters} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium underline underline-offset-4 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"><X aria-hidden="true" className="h-4 w-4" />Clear filters</button>}
          </div>

          {visibleProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {visibleProducts.map((product, index) => <ProductCard key={product.id ?? `${product.name}-${index}`} {...product} onClick={() => setSelectedProduct(product)} />)}
            </div>
          ) : !loading && (
            <div className="rounded-2xl border border-border px-5 py-16 text-center">
              <Search aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">{products.length ? 'No products match your search' : 'The collection is currently unavailable'}</h2>
              <p className="mb-6 text-sm text-muted-foreground">{products.length ? 'Try a different name or choose another category.' : 'Please try again shortly.'}</p>
              {hasFilters && <button type="button" onClick={clearFilters} className="rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500">View all products</button>}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {selectedProduct && (
        <ProductModal 
          {...selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
