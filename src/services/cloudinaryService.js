const CLOUD_NAME = 'di4nfc7fg';
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

export function cloudinaryUrl(publicId, options = {}) {
  if (!publicId) return '';
  if (publicId.startsWith('http')) {
    if (publicId.includes('res.cloudinary.com')) return publicId;
    return publicId;
  }
  const { w, h, q = 'auto', f = 'auto', c = 'fill', g = 'auto', e, blur } = options;
  const parts = [];
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  parts.push(`c_${c}`, `g_${g}`, `q_${q}`, `f_${f}`);
  if (e) parts.push(`e_${e}`);
  if (blur) parts.push(`e_blur:${blur}`);
  return `${BASE_URL}/${parts.join(',')}/${publicId}`;
}

export function cloudinarySrcSet(publicId, sizes = [200, 400, 600, 800, 1200]) {
  return sizes.map((s) => `${cloudinaryUrl(publicId, { w: s, q: 80 })} ${s}w`).join(', ');
}

export function cloudinaryBlurPlaceholder(publicId) {
  return cloudinaryUrl(publicId, { w: 20, blur: 1000, q: 1 });
}
