import { productImage } from "@/react-app/lib/assets";
import { catalog } from "../../shared/catalog";

export interface Product {
  id?: string;
  image: string;
  name: string;
  price: string;
  category: string;
}

export const allProducts: Product[] = catalog.map(product => ({
  ...product,
  image: productImage(product.image),
}));

export const featuredProducts = allProducts.slice(0, 10);
