const DEFAULT_IMAGE_BASE_URL = "https://019b23df-d065-7b60-a3d6-b66362facd83.mochausercontent.com";

function joinUrl(baseUrl: string, fileName: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const cleanFileName = fileName.replace(/^\/+/, "");
  const encodedPath = cleanFileName
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${encodedPath}`;
}

function toStorageMediaUrl(bucket: string, objectPath: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

export function getAlternateStorageUrl(url: string): string | null {
  const fallbackBaseUrl = import.meta.env.VITE_PRODUCT_IMAGE_BASE_URL?.trim() || DEFAULT_IMAGE_BASE_URL;
  if (!fallbackBaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "firebasestorage.googleapis.com" && parsed.pathname.includes("/o/")) {
      const encodedPath = parsed.pathname.slice(parsed.pathname.indexOf("/o/") + 3);
      const objectPath = decodeURIComponent(encodedPath);
      const fileName = objectPath.split("/").filter(Boolean).pop();
      if (fileName) {
        return joinUrl(fallbackBaseUrl, fileName);
      }
    }

    const fallbackName = parsed.pathname.split("/").filter(Boolean).pop();
    if (fallbackName) {
      return joinUrl(fallbackBaseUrl, fallbackName);
    }
  } catch {
    const fallbackName = url.split("?")[0].split("#")[0].split("/").filter(Boolean).pop();
    if (fallbackName) {
      return joinUrl(fallbackBaseUrl, fallbackName);
    }
  }

  return null;
}

export function resolveProductImage(value: string) {
  const input = value.trim();
  if (!input) {
    return "";
  }

  if (
    input.startsWith("http://") ||
    input.startsWith("https://") ||
    input.startsWith("data:") ||
    input.startsWith("blob:")
  ) {
    return input;
  }

  const gsMatch = input.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (gsMatch) {
    return toStorageMediaUrl(gsMatch[1], gsMatch[2]);
  }

  const defaultBaseUrl = import.meta.env.VITE_PRODUCT_IMAGE_BASE_URL?.trim() || DEFAULT_IMAGE_BASE_URL;
  const fallbackName = input.replace(/^\/+/, "").replace(/^products\//, "");
  return joinUrl(defaultBaseUrl, fallbackName);
}

export function productImage(fileName: string) {
  return resolveProductImage(fileName);
}
