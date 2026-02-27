import { useState } from 'react';
import Navbar from '@/react-app/components/Navbar';
import ProductCard from '@/react-app/components/ProductCard';
import ProductModal from '@/react-app/components/ProductModal';
import Footer from '@/react-app/components/Footer';
import { Product } from '@/react-app/data/products';
import { useProducts } from '@/react-app/hooks/useProducts';

export default function AllProducts() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { products, loading, error } = useProducts();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 
            className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tighter"
            style={{ fontFamily: 'Anton, sans-serif' }}
          >
            ALL PRODUCTS
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Browse the complete Online Streetwear collection. {products.length} pieces of urban fashion crafted with passion.
          </p>
          {loading && <p className="text-gray-500 text-sm mt-3">Loading products...</p>}
          {error && <p className="text-gray-500 text-sm mt-3">{error}</p>}
        </div>
      </section>

      {/* Products Grid */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map((product, index) => (
              <ProductCard 
                key={product.id ?? `${product.name}-${index}`} 
                {...product} 
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </div>
      </section>

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
