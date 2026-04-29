/**
 * Compression client de photos avant upload Storage.
 * Cible : ~300 KB max via WebP quality 70, 1280px max côté.
 * Hard cap 500 KB → fallback quality 50 si dépassement.
 *
 * Utilise OffscreenCanvas pour traiter hors du thread principal quand dispo.
 * Fallback canvas DOM pour Safari iOS qui n'a pas OffscreenCanvas (jusqu'à
 * iOS 16.4).
 */

const TARGET_MAX_BYTES = 500_000;
const TARGET_DIMENSION = 1280;

export async function compressPhoto(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  // Guard upscale : si l'image est déjà plus petite que la cible, on garde
  // ses dimensions natives — sinon on créerait un fichier plus lourd.
  const longest = Math.max(bitmap.width, bitmap.height);
  let w: number;
  let h: number;
  if (longest <= TARGET_DIMENSION) {
    w = bitmap.width;
    h = bitmap.height;
  } else {
    const ratio = bitmap.width / bitmap.height;
    if (bitmap.width > bitmap.height) {
      w = TARGET_DIMENSION;
      h = Math.round(TARGET_DIMENSION / ratio);
    } else {
      w = Math.round(TARGET_DIMENSION * ratio);
      h = TARGET_DIMENSION;
    }
  }

  let blob = await drawAndEncode(bitmap, w, h, 0.7);
  if (blob.size > TARGET_MAX_BYTES) {
    blob = await drawAndEncode(bitmap, w, h, 0.5);
  }
  bitmap.close();
  return blob;
}

async function drawAndEncode(
  bitmap: ImageBitmap,
  w: number,
  h: number,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context indisponible (OffscreenCanvas)");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.convertToBlob({ type: "image/webp", quality });
  }

  // Fallback Safari iOS < 16.4 — canvas DOM
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context indisponible (DOM)");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob a renvoyé null"))),
      "image/webp",
      quality,
    );
  });
}
