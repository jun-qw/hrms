/** Colour helpers for the branding theme. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Accepts #rgb / #rrggbb (with or without the hash). */
export function parseHex(hex: string): Rgb | null {
  const v = hex.trim().replace(/^#/, '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function isValidHex(hex: string): boolean {
  return parseHex(hex) !== null;
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Picks readable text for a brand-coloured surface. The 0.45 threshold keeps
 * mid-tone brand colours (indigo, teal) on white text, which is what buttons
 * of that shade normally use.
 */
export function readableForeground(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#ffffff';
  return relativeLuminance(rgb) > 0.45 ? '#111827' : '#ffffff';
}

/** Mixes a colour toward white; used for subtle tinted backgrounds. */
export function tint(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
}
