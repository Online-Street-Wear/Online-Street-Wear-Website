interface ProductCardProps {
  image: string;
  name: string;
  price: string;
  category: string;
  onClick: () => void;
}

export default function ProductCard({ image, name, price, category, onClick }: ProductCardProps) {
  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-900 mb-4">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button className="w-full bg-white text-black py-2 px-4 rounded-lg font-medium hover:bg-red-500 hover:text-white transition">
            Quick View
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{category}</p>
        <h3 className="text-sm font-medium text-white">{name}</h3>
        <p className="text-lg font-bold text-white">R{price}</p>
      </div>
    </div>
  );
}
