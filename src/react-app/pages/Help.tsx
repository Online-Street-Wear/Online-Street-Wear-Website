import { ArrowRight, ArrowUpRight, ChevronDown, MapPin, PackageCheck, PackageSearch, Truck } from 'lucide-react';
import { Link } from 'react-router';
import Footer from '@/react-app/components/Footer';
import Navbar from '@/react-app/components/Navbar';
import { PRODUCT_SIZES } from '@/shared/product-options';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_BY_PROVINCE, SHIPPING_PROVINCE_OPTIONS } from '@/shared/shipping';

const linkClass = 'font-medium underline underline-offset-4 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500';
const headingFont = { fontFamily: 'Anton, sans-serif' };
const steps = [
  { number: '01', icon: MapPin, title: 'Choose your pickup point', description: 'At checkout, enter your province, PAXI point name and point code. Check these details and your phone number before paying.' },
  { number: '02', icon: Truck, title: 'Follow your parcel', description: 'After the store hands your parcel to PAXI, your parcel number appears on your order page. Use it on PAXI tracking for courier updates.' },
  { number: '03', icon: PackageCheck, title: 'Collect when it is ready', description: 'Wait for confirmation that your parcel is ready at your selected point. Follow the collection instructions and PIN provided by PAXI.' },
];
const questions = [
  {
    question: 'Which size should I choose?',
    answer: <>Choose from {PRODUCT_SIZES.join(', ')} before adding a piece to your bag. Fit can vary by item. If you need measurements or advice, <a href="/#contact" className={linkClass}>contact us</a> with the product name before ordering.</>,
  },
  {
    question: 'Can I request a different colour?',
    answer: <>Use the colour request field when choosing a product. A requested colour is subject to availability; the store will confirm availability before preparing your order. Leave it as “As pictured” if you want the displayed colour.</>,
  },
  {
    question: 'How do I know my order has arrived?',
    answer: <>Check <Link to="/track-order" className={linkClass}>Track Order</Link> for the latest update from the store. “Ready for collection” means your parcel has arrived at the selected point. You can also use your parcel number on official PAXI tracking. Follow PAXI’s collection instructions before travelling to the point.</>,
  },
  {
    question: 'What if I cannot find my confirmation email?',
    answer: <>Check your spam and promotions folders. If you have your order number, track it using the email entered at checkout. If you need help finding the order, <a href="/#contact" className={linkClass}>contact the store</a> with your checkout details or payment reference.</>,
  },
  {
    question: 'Can I correct my order or collection point?',
    answer: <>Contact the store as soon as possible with your order number and the correction needed. We will check what is possible for the order’s current stage. Please check your size, colour request and PAXI details carefully before paying.</>,
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main id="main-content">
        <header className="border-b border-white/10 bg-black px-4 pb-14 pt-32 text-white sm:px-6 sm:pb-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-20">
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-red-500">The details, sorted.</p>
              <h1 className="text-5xl leading-tight tracking-tight sm:text-6xl lg:text-7xl" style={headingFont}>SHIPPING<br />&amp; HELP<span className="text-red-500">.</span></h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-gray-400">Your next piece, your chosen PAXI point. Here is what to know before you check out and when your order is on its way.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8">
              <PackageSearch className="mb-5 h-7 w-7 text-red-500" aria-hidden="true" />
              <h2 className="text-xl font-semibold">Already placed an order?</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">Use your order number and checkout email to see the latest store update, your parcel number and collection point.</p>
              <Link to="/track-order" className="mt-6 inline-flex items-center gap-3 rounded-lg bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Track My Order <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </header>

        <section aria-labelledby="paxi-heading" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">From checkout to collection</p>
              <h2 id="paxi-heading" className="text-3xl sm:text-4xl" style={headingFont}>HOW PAXI COLLECTION WORKS</h2>
            </div>
            <a href="https://www.paxi.co.za/track-a-parcel" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500">Official PAXI tracking <ArrowUpRight className="h-4 w-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map(step => (
              <li key={step.number} className="rounded-xl border border-border p-6">
                <div className="mb-6 flex items-center justify-between"><step.icon className="h-6 w-6 text-red-500" aria-hidden="true" /><span className="text-3xl text-muted-foreground/40" style={headingFont} aria-hidden="true">{step.number}</span></div>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
          <section id="delivery" aria-labelledby="shipping-heading" className="scroll-mt-24">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Know your total</p>
            <h2 id="shipping-heading" className="text-3xl sm:text-4xl" style={headingFont}>DELIVERY FEES</h2>
            <p className="mb-6 mt-4 text-sm leading-relaxed text-muted-foreground">Delivery to your selected PAXI point is charged by province. Your delivery fee is shown before payment.</p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">PAXI delivery fees for orders of R{FREE_SHIPPING_THRESHOLD} or less</caption>
                <thead className="bg-muted"><tr><th scope="col" className="px-5 py-4 font-semibold">Province</th><th scope="col" className="px-5 py-4 text-right font-semibold">Delivery</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {SHIPPING_PROVINCE_OPTIONS.map(province => <tr key={province.value}><th scope="row" className="px-5 py-3.5 font-normal">{province.label}</th><td className="px-5 py-3.5 text-right tabular-nums">R{SHIPPING_BY_PROVINCE[province.value]}</td></tr>)}
                </tbody>
              </table>
              <div className="border-t border-red-500/20 bg-red-500/10 px-5 py-4">
                <p className="text-sm font-semibold">Free delivery on orders over R{FREE_SHIPPING_THRESHOLD}.</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Based on your items total before delivery. The standard fee applies at exactly R{FREE_SHIPPING_THRESHOLD}.</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="questions-heading">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">A little clarity</p>
            <h2 id="questions-heading" className="text-3xl sm:text-4xl" style={headingFont}>COMMON QUESTIONS</h2>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {questions.map((item, index) => (
                <details key={item.question} className="group" open={index === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 [&::-webkit-details-marker]:hidden">{item.question}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
                  <div className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.answer}</div>
                </details>
              ))}
            </div>
            <div className="mt-7 rounded-xl bg-muted p-6">
              <h3 className="text-base font-semibold">Still need a hand?</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Get in touch about a product or an existing order. Keep your order number ready if you have one.</p>
              <a href="/#contact" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500">Contact Us <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          </section>
        </div>

        <section aria-label="Continue shopping" className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5"><p className="text-2xl" style={headingFont}>READY TO FIND YOUR NEXT PIECE?</p><Link to="/products" className="inline-flex items-center gap-3 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:bg-red-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500">Explore the Collection <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
