import { getAlternateStorageUrl } from "@/react-app/lib/assets";
import { Heart } from 'lucide-react';
import { useSavedProducts } from '@/react-app/contexts/SavedProductsContext';
import { fallbackProductId } from '@/react-app/lib/cart-storage';

interface ProductCardProps {
  id?: string;
  image: string;
  name: string;
  price: string;
  category: string;
  onClick: () => void;
}

export default function ProductCard({ id, image, name, price, category, onClick }: ProductCardProps) {
  const { savedIds, toggle } = useSavedProducts();
  const productId = id || fallbackProductId(name);
  const saved = savedIds.includes(productId);
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const imageElement = event.currentTarget;
    if (imageElement.dataset.fallbackTried === "1") {
      return;
    }

    const currentSrc = imageElement.src;
    const alternateSrc = getAlternateStorageUrl(currentSrc);

    if (alternateSrc && currentSrc !== alternateSrc) {
      imageElement.dataset.fallbackTried = "1";
      imageElement.src = alternateSrc;
    }
  };

  return (
    <article className="group relative">
      <button type="button" onClick={() => toggle(productId)} aria-pressed={saved}
        aria-label={`${saved ? 'Remove' : 'Save'} ${name}${saved ? ' from saved picks' : ' for later'}`}
        className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white backdrop-blur hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500">
        <Heart aria-hidden="true" className={`h-5 w-5 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
      </button>
      <button
        type="button"
        onClick={onClick}
        aria-label={`View ${name}`}
        className="relative block w-full overflow-hidden rounded-lg bg-gray-900 mb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
      >
        <img 
          src={image} 
          alt={name}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
          className="block w-full h-auto object-contain"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 transition-all duration-300">
          <span className="block w-full bg-white text-black py-2 px-4 rounded-lg font-medium transition">
            Quick View
          </span>
        </span>
      </button>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{category}</p>
        <h3 className="text-sm font-medium text-foreground">{name}</h3>
        <p className="text-lg font-bold text-foreground">R{price}</p>
        <p className="text-xs text-muted-foreground pt-1">S, M, L, XL, XXL</p>
        <p className="text-xs text-muted-foreground">Other colours by request</p>
        <button
          type="button"
          onClick={onClick}
          aria-label={`Choose size and colour for ${name}`}
          className="text-sm font-medium text-red-400 hover:text-red-300 [.light_&]:text-red-700 [.light_&]:hover:text-red-800 underline underline-offset-4 py-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          Choose size &amp; colour
        </button>
      </div>
    </article>
  );
}
