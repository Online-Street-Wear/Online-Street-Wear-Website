import { X, ShoppingBag, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCart } from '@/react-app/contexts/CartContext';

interface ProductModalProps {
  image: string;
  name: string;
  price: string;
  category: string;
  onClose: () => void;
}

export default function ProductModal({ image, name, price, category, onClose }: ProductModalProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleAddToCart = () => {
    addToCart({ name, price, image, category });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-gray-900 rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="sticky top-4 right-4 z-10 ml-auto mr-4 p-2 bg-black/70 hover:bg-black/90 rounded-full transition flex items-center justify-center"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative bg-white min-h-[50vh] md:min-h-[60vh] flex items-center justify-center">
            <img 
              src={image} 
              alt={name}
              className="w-full h-full object-contain p-4 sm:p-8"
            />
          </div>

          {/* Details Section */}
          <div className="p-6 sm:p-8 md:p-12 flex flex-col justify-between min-h-[50vh]">
            <div>
              <p className="text-xs sm:text-sm text-red-500 uppercase tracking-wider mb-2">{category}</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" style={{ fontFamily: 'Anton, sans-serif' }}>
                {name}
              </h2>
              <p className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">R{price}</p>

              <div className="space-y-4 mb-6 sm:mb-8">
                <div className="pb-4 border-b border-gray-700">
                  <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2">Description</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Premium streetwear piece from Online's latest collection. Crafted with high-quality materials 
                    and attention to detail that defines urban fashion.
                  </p>
                </div>

                <div className="pb-4 border-b border-gray-700">
                  <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2">Features</h3>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Premium quality fabric</li>
                    <li>• Limited edition design</li>
                    <li>• Comfortable fit</li>
                    <li>• Machine washable</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2">Size Guide</h3>
                  <p className="text-gray-400 text-sm">Available in S, M, L, XL, XXL</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pb-6 sm:pb-0">
              <button 
                onClick={handleAddToCart}
                className={`w-full ${added ? 'bg-green-500' : 'bg-red-500 hover:bg-red-600'} text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                    Add to Cart
                  </>
                )}
              </button>
              <button 
                onClick={onClose}
                className="w-full border-2 border-gray-700 hover:border-gray-500 text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition text-sm sm:text-base"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
