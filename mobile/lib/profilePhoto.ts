import { API_BASE_URL } from "@/constants/api";

export function resolveProfilePhotoUri(value?: string | null) {
  const photo = String(value || "").trim();
  if (!photo) return "";
  if (/^(https?:|data:|file:|content:|blob:)/i.test(photo)) return photo;
  if (photo.startsWith("//")) return `https:${photo}`;
  if (/^\/9j\//.test(photo)) return `data:image/jpeg;base64,${photo}`;
  if (/^iVBOR/.test(photo)) return `data:image/png;base64,${photo}`;
  const path = photo.startsWith("/") ? photo : `/${photo}`;
  return `${API_BASE_URL}${path}`;
}
