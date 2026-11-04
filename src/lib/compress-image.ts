/**
 * Browser-side: shrinks a large photo before it's uploaded. A phone camera
 * picture of a receipt is often 4–12 MB; resized to at most 2000px on its
 * longest side as a JPEG it's typically 300–800 KB, still easy to read, and
 * well under the 15 MB upload limit (services/attachment.service.ts).
 *
 * PDFs, GIFs and small images are returned unchanged, as is anything the
 * browser can't decode.
 */
const MAX_DIMENSION = 2000;
const COMPRESS_ABOVE_BYTES = 1_500_000;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size <= COMPRESS_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff"; // transparent PNGs become white, not black, as JPEG
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Compresses if useful, then checks the size limit. Returns the file to upload, or an error message. */
export async function prepareUpload(file: File): Promise<{ file: File } | { error: string }> {
  const prepared = await compressImageForUpload(file);
  if (prepared.size > MAX_UPLOAD_BYTES) return { error: `“${file.name}” is ${(prepared.size / 1024 / 1024).toFixed(1)} MB. Files must be 15 MB or smaller.` };
  return { file: prepared };
}
