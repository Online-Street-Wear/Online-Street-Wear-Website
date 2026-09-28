import { useState } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';
import ProductCard from '@/react-app/components/ProductCard';
import ProductModal from '@/react-app/components/ProductModal';
import { useSavedProducts } from '@/react-app/contexts/SavedProductsContext';
import { useProducts } from '@/react-app/hooks/useProducts';
import { fallbackProductId } from '@/react-app/lib/cart-storage';
import type { Product } from '@/react-app/data/products';

export default function SavedProducts() {
  const { savedIds, remove, storageAvailable } = useSavedProducts();
  const { products, loading } = useProducts();
  const [selected, setSelected] = useState<Product | null>(null);
  const byId = new Map(products.map(product => [product.id || fallbackProductId(product.name), product]));
  const saved = savedIds.map(id => byId.get(id)).filter((product): product is Product => !!product);
  const unavailable = savedIds.filter(id => !byId.has(id));

  return <div className="min-h-screen bg-background text-foreground">
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <header className="mb-9">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Keep your favourites close</p>
        <h1 className="text-4xl font-bold sm:text-6xl" style={{ fontFamily: 'Anton, sans-serif' }}>SAVED PICKS</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">Tap a heart to save a piece for later. Choose your size and colour when you are ready to shop.</p>
        <p role="status" className="mt-3 text-sm text-muted-foreground">{storageAvailable ? 'Saved in this browser. Your list is not shared across devices.' : 'Browser storage is unavailable. Your picks will last for this visit only.'}</p>
      </header>
      {saved.length > 0 ? <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{saved.length} saved {saved.length === 1 ? 'pick' : 'picks'}</p>
          <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-red-500">Keep exploring <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {saved.map(product => <ProductCard key={product.id || product.name} {...product} onClick={() => setSelected(product)} />)}
        </div>
      </> : <section className="rounded-2xl border border-border bg-muted px-6 py-16 text-center">
        <Heart className="mx-auto mb-5 h-10 w-10 text-red-500" />
        <h2 className="text-2xl font-bold">{savedIds.length ? loading ? 'Checking your saved picks' : 'Your saved picks are unavailable' : 'Your next favourite is waiting'}</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{savedIds.length ? 'Some saved products may be unavailable in the current collection.' : 'Save pieces you like from the collection and find them here whenever you come back.'}</p>
        <Link to="/products" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600">Explore the collection <ArrowRight className="h-4 w-4" /></Link>
      </section>}
      {loading && savedIds.length > 0 && <p role="status" className="mt-6 text-sm text-muted-foreground">Checking the latest collection…</p>}
      {!loading && unavailable.length > 0 && <div className="mt-8 rounded-lg border border-border p-5 text-sm">
        <p>{unavailable.length} saved {unavailable.length === 1 ? 'item is' : 'items are'} unavailable in the current collection.</p>
        <button type="button" onClick={() => remove(unavailable)} className="mt-3 font-semibold underline underline-offset-4">Remove unavailable picks</button>
      </div>}
    </main>
    <Footer />
    {selected && <ProductModal {...selected} onClose={() => setSelected(null)} />}
  </div>;
}
