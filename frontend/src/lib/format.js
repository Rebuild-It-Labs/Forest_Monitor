/** Small formatting + URL helpers. */

export const fmtNum = (n, decimals = 0) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);

export const fmtLat = (lat) => `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`;
export const fmtLng = (lng) => `${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
export const pad = (n, len = 2) => String(n).padStart(len, '0');

export const fmtClock = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
export const fmtSigned = (n, decimals = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNum(Math.abs(n), decimals)}`;

/**
 * Resolve an asset path from data.json.
 *  - absolute URLs (http(s), data:, //) are returned untouched
 *  - otherwise joined onto meta.assetBase ('/' means "the Vite base URL")
 */
export function resolveAsset(assetBase, src) {
  if (!src) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  const viteBase = import.meta.env.BASE_URL || '/';
  const base = !assetBase || assetBase === '/' ? viteBase : assetBase;
  return `${base.replace(/\/+$/, '')}/${src.replace(/^\/+/, '')}`;
}

export const SEVERITY_STYLE = {
  CRITICAL: { text: 'text-alert-red', border: 'border-alert-red/50', bg: 'bg-alert-red/10', dot: 'bg-alert-red' },
  ELEVATED: { text: 'text-alert-amber', border: 'border-alert-amber/50', bg: 'bg-alert-amber/10', dot: 'bg-alert-amber' },
  STABLE: { text: 'text-neon', border: 'border-neon/40', bg: 'bg-neon/10', dot: 'bg-neon' },
};
