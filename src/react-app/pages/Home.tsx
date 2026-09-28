import { ArrowRight, Truck, Shield, PackageSearch, Instagram, Facebook } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import Navbar from '@/react-app/components/Navbar';
import ProductCard from '@/react-app/components/ProductCard';
import ProductModal from '@/react-app/components/ProductModal';
import NewsletterForm from '@/react-app/components/NewsletterForm';
import Footer from '@/react-app/components/Footer';
import { Product } from '@/react-app/data/products';
import { useProducts } from '@/react-app/hooks/useProducts';
import { productImage } from '@/react-app/lib/assets';
import { FREE_SHIPPING_THRESHOLD } from '@/shared/shipping';

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { products, loading } = useProducts();
  const featuredProducts = products.slice(0, 10);
  const categories = [...new Set(products.map(product => product.category))].sort();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black pt-16 text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${productImage("WhatsApp-Image-2025-12-16-at-15.12.18.jpeg")})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />
        </div>
        
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="mb-6 inline-block">
            <span className="text-sm font-medium tracking-wider text-red-500 uppercase">
              Est. 2021
            </span>
          </div>
          <h1 
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-6 tracking-tighter leading-none"
            style={{ fontFamily: 'Anton, sans-serif' }}
          >
            ONLINE<span className="text-red-500">.</span>
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl mb-4 text-gray-300 font-light">
            STREETWEAR
          </p>
          <p className="text-base sm:text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Define your style with bold, contemporary pieces that capture the essence of urban culture.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="#collections"
              className="group px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-red-500 hover:text-white transition inline-flex items-center gap-2"
            >
              Shop Collection
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#about"
              className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-black transition"
            >
              Our Story
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="collections" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ fontFamily: 'Anton, sans-serif' }}>
              FEATURED DROPS
            </h2>
            <p className="text-muted-foreground text-lg">Curated pieces from our latest collection</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Shop by category">
              {categories.map(category => <Link key={category} to={`/products?${new URLSearchParams({ category })}`} className="rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium transition hover:border-red-500 hover:text-red-500">{category}</Link>)}
            </div>
            {loading && products.length === 0 && <p className="text-muted-foreground text-sm mt-3">Loading products...</p>}
            {!loading && products.length === 0 && <p className="text-muted-foreground text-sm mt-3">The collection is currently unavailable. Please try again shortly.</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5">
            {featuredProducts.map((product, index) => (
              <ProductCard 
                key={product.id ?? `${product.name}-${index}`} 
                {...product} 
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-foreground text-foreground font-semibold rounded-lg hover:bg-foreground hover:text-background transition"
            >
              View All {products.length} Products
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ fontFamily: 'Anton, sans-serif' }}>
                BORN IN THE STREETS
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Since 2021, Online Streetwear has been at the forefront of urban fashion, blending contemporary design with street culture authenticity.
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Our mission is simple: create bold, high-quality pieces that empower you to express your unique identity. Every drop is designed locally with attention to detail, sustainability, and the raw energy of street culture.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Premium Quality</h3>
                    <p className="text-sm text-muted-foreground">Crafted with the finest materials for lasting wear</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Truck className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">PAXI Collection</h3>
                    <p className="text-sm text-muted-foreground">Collect at your selected PAXI point. Free delivery on orders over R{FREE_SHIPPING_THRESHOLD}.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <PackageSearch className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Track Your Order</h3>
                    <p className="text-sm text-muted-foreground">Follow your order from confirmation to collection.</p>
                    <Link to="/track-order" className="mt-1 inline-block text-sm font-medium text-red-500 underline underline-offset-4 hover:text-red-600">Check order progress</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img 
                  src={productImage("WhatsApp-Image-2025-12-16-at-15.12.17-(2).jpeg")}
                  alt="Brand story"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-red-500/20 rounded-lg blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Customer support */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-2xl border border-border bg-muted p-6 sm:p-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Here to help</p>
            <h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'Anton, sans-serif' }}>LET’S TALK STREETWEAR</h2>
            <p className="mt-4 text-muted-foreground">Need help with fit, a colour request or your order? Find delivery answers in our help centre, or reach us through our social pages.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/help" className="rounded-xl border border-border bg-background px-5 py-4 font-semibold hover:border-red-500">Shipping &amp; Help <ArrowRight className="mt-3 h-5 w-5 text-red-500" /></Link>
            <Link to="/track-order" className="rounded-xl border border-border bg-background px-5 py-4 font-semibold hover:border-red-500">Track your order <PackageSearch className="mt-3 h-5 w-5 text-red-500" /></Link>
            <a href="https://www.instagram.com/onliine_78" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:text-red-500"><Instagram className="h-5 w-5" />Instagram<span className="sr-only"> (opens in a new tab)</span></a>
            <a href="https://www.facebook.com/groups/1441621759504684/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:text-red-500"><Facebook className="h-5 w-5" />Facebook<span className="sr-only"> (opens in a new tab)</span></a>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ fontFamily: 'Anton, sans-serif' }}>
            STAY UPDATED
          </h2>
          <p className="text-muted-foreground mb-8">
            Subscribe to get early access to drops, exclusive offers, and street culture news.
          </p>
          <NewsletterForm />
        </div>
      </section>
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
