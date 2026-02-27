function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function joinUrl(baseUrl: string, fileName: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const cleanFileName = fileName.replace(/^\/+/, "");
  return `${base}/${encodeURIComponent(cleanFileName)}`;
}

export function productImage(fileName: string) {
  const customBaseUrl = import.meta.env.VITE_PRODUCT_IMAGE_BASE_URL?.trim();

  if (customBaseUrl) {
    return joinUrl(customBaseUrl, fileName);
  }

  const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucket) {
    return "";
  }

  const prefix = trimSlashes(import.meta.env.VITE_PRODUCT_IMAGE_PATH_PREFIX || "products");
  const objectPath = `${prefix}/${fileName}`;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
}
