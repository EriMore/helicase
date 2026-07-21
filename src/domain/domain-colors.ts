export const DOMAIN_PALETTE_HEX = ["#3c5a86", "#8f4a44", "#3f6f60", "#9a7a34", "#6a4a70", "#4a4f57"];
export const DOMAIN_PALETTE_TOKENS = ["var(--fam-0)", "var(--fam-1)", "var(--fam-2)", "var(--fam-3)", "var(--fam-4)", "var(--fam-5)"];

export function domainColorHex(index: number): string {
  return DOMAIN_PALETTE_HEX[index % DOMAIN_PALETTE_HEX.length];
}

export function domainColorToken(index: number): string {
  return DOMAIN_PALETTE_TOKENS[index % DOMAIN_PALETTE_TOKENS.length];
}
