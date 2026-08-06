import * as FileSystem from "expo-file-system";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function toUploadableMediaUri(uri?: string | null): Promise<string | null> {
  const value = String(uri || "").trim();
  if (!value) return null;

  // already a data: URI
  if (/^data:/i.test(value)) return value;

  // remote http(s) — upload remote url as-is
  if (/^https?:\/\//i.test(value)) return value;

  // file:// URIs (local files on device) — use Expo FileSystem to read and convert to base64
  if (/^file:\/\//i.test(value)) {
    try {
      const info = await FileSystem.getInfoAsync(value, { size: true });
      if (!info.exists) throw new Error("Could not read the selected media file.");
      if (info.size && info.size > MAX_UPLOAD_BYTES) throw new Error("Selected media must be smaller than 8MB.");

      const b64 = await FileSystem.readAsStringAsync(value, { encoding: FileSystem.EncodingType.Base64 });

      // Infer a mime type from file extension if possible, default to jpeg
      const extMatch = value.match(/\.([0-9a-zA-Z]+)(?:\?|$)/);
      const ext = extMatch && extMatch[1] ? extMatch[1].toLowerCase() : "";
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      return `data:${mime};base64,${b64}`;
    } catch (error) {
      throw new Error("Could not read the selected media file.");
    }
  }

  // For other URIs (blob:, content:, data URLs already handled above), try fetch -> blob -> dataURL
  try {
    const response = await fetch(value);
    if (!response.ok) throw new Error("Could not read the selected media file.");
    const blob = await response.blob();
    if (!blob.size || blob.size > MAX_UPLOAD_BYTES) {
      throw new Error("Selected media must be smaller than 8MB.");
    }

    return await new Promise<string>((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not prepare the selected media file."));
        reader.onload = () => resolve(String(reader.result || ""));
        reader.readAsDataURL(blob);
      } catch (e) {
        reject(new Error("Could not prepare the selected media file."));
      }
    });
  } catch (error) {
    throw new Error("Could not read the selected media file.");
  }
}
