import { Link } from 'react-router';
import Navbar from '@/react-app/components/Navbar';
import Footer from '@/react-app/components/Footer';

export default function NotFound() {
  return <div className="min-h-screen bg-background text-foreground">
    <Navbar />
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-40 text-center">
      <p className="text-sm font-semibold tracking-[0.25em] text-red-500">404 — PAGE NOT FOUND</p>
      <h1 className="mt-5 text-4xl font-bold sm:text-6xl" style={{ fontFamily: 'Anton, sans-serif' }}>LET’S GET YOU BACK</h1>
      <p className="mt-5 text-muted-foreground">This page may have moved, or the link may be incorrect. Your next pick is still in the collection.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/products" className="rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600">Shop the collection</Link>
        <Link to="/track-order" className="rounded-lg border border-border px-6 py-3 font-semibold hover:border-red-500">Track an order</Link>
      </div>
    </main>
    <Footer />
  </div>;
}
