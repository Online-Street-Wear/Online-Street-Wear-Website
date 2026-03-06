import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { allProducts as fallbackProducts, Product } from "@/react-app/data/products";
import { db, isFirebaseConfigured } from "@/react-app/lib/firebase";
import { resolveProductImage } from "@/react-app/lib/assets";

type ProductSource = "firebase" | "fallback";

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  source: ProductSource;
  error: string | null;
}

interface ProductRecord {
  image?: unknown;
  name?: unknown;
  price?: unknown;
  category?: unknown;
}

function toProduct(docId: string, record: ProductRecord): Product | null {
  if (
    typeof record.image !== "string" ||
    typeof record.name !== "string" ||
    typeof record.category !== "string"
  ) {
    return null;
  }

  let price = "";
  if (typeof record.price === "number") {
    price = record.price.toFixed(2);
  } else if (typeof record.price === "string") {
    price = record.price;
  }

  if (!price) {
    return null;
  }

  return {
    id: docId,
    image: resolveProductImage(record.image),
    name: record.name,
    price,
    category: record.category,
  };
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<ProductSource>("fallback");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadProducts() {
      if (!isFirebaseConfigured || !db) {
        if (!isCancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, "products"));
        const firebaseProducts = snapshot.docs
          .map((doc) => toProduct(doc.id, doc.data() as ProductRecord))
          .filter((product): product is Product => product !== null);

        if (!isCancelled) {
          if (firebaseProducts.length > 0) {
            setProducts(firebaseProducts);
            setSource("firebase");
          } else {
            setError("No products found in Firestore. Showing local products.");
            setSource("fallback");
          }
        }
      } catch {
        if (!isCancelled) {
          setError("Could not load products from Firebase. Showing local products.");
          setSource("fallback");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    products,
    loading,
    source,
    error,
  };
}
