/** WCAG relative luminance of a #rrggbb color (0 = black, 1 = white). */
const luminance = (hex: string): number => {
  const ch = (i: number) => {
    const v = parseInt(hex.substring(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
};

/**
 * The fill to draw an event card with so WHITE text on it stays readable.
 * Light colors (yellow, cyan, white) are darkened toward black until white text reaches
 * a 4.5:1 contrast. Colors that already work are returned unchanged.
 */
export const eventFill = (hex: string): string => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const MAX_LUMINANCE = 1.05 / 4.5 - 0.05; // white text needs L <= ~0.183
  if (luminance(hex) <= MAX_LUMINANCE) return hex;
  const rgb = [1, 3, 5].map(i => parseInt(hex.substring(i, i + 2), 16));
  for (let f = 0.95; f > 0.2; f -= 0.03) {
    const out = '#' + rgb.map(c => Math.round(c * f).toString(16).padStart(2, '0')).join('');
    if (luminance(out) <= MAX_LUMINANCE) return out;
  }
  return '#333333';
};
