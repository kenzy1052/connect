// src/utils/imageUrl.js
//
// Feed images are displayed tiny (≈158px on the grid) but Supabase Storage
// serves the full-resolution original by default. That wastes hundreds of KB
// per image. Supabase supports on-the-fly image transformation via the
// `render/image` endpoint — we rewrite the public object URL to request a
// small, compressed variant instead.

const OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

/**
 * Build a resized/compressed thumbnail URL for a Supabase public object URL.
 * Non-Supabase URLs (placeholder, external) are returned unchanged.
 *
 * @param {string} url    original image URL
 * @param {number} width  target width in px (device-independent)
 * @param {number} quality 1-100
 */
export function thumb(url, width = 320, quality = 65) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes(OBJECT)) return url; // placeholder / external → leave alone
  const base = url.replace(OBJECT, RENDER);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}width=${width}&quality=${quality}&resize=cover`;
}

/** Convenience: a 2-density srcSet string for a square thumbnail. */
export function thumbSrcSet(url, width = 320, quality = 65) {
  if (!url || !url.includes(OBJECT)) return undefined;
  return `${thumb(url, width, quality)} 1x, ${thumb(url, width * 2, quality)} 2x`;
}
