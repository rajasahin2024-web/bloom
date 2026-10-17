/**
 * useMediaUpload — a hook that uploads an image to the CMS media store
 * and returns the public URL. Client-side guards reject files over 512KB
 * or non-PNG/JPEG/WebP types before hitting the network.
 */
import { apiFetch } from "@/lib/api";

export interface CmsMediaOut {
  id: string;
  storage_key: string;
  url: string;
  filename: string;
  alt_text: string | null;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

const MAX_BYTES = 512 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function useMediaUpload(token: string) {
  return async (file: File): Promise<string> => {
    if (file.size > MAX_BYTES) {
      throw new Error("File is too large — keep it under 512KB.");
    }
    if (!ALLOWED.has(file.type)) {
      throw new Error("Only PNG, JPEG and WebP images are allowed.");
    }
    const dataUrl = await readFileAsDataURL(file);
    const { data } = await apiFetch<CmsMediaOut>("/api/cms/media/upload", {
      method: "POST",
      token,
      body: { filename: file.name, mime_type: file.type, data_url: dataUrl },
    });
    return data.url;
  };
}
