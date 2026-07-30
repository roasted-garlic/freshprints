/**
 * Portal print-request limit customer copy (sole limit L + show capacity).
 * No Cap A daily jargon. No em dashes.
 */

function finitePositive(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

/**
 * Customer has used all L print spots on this show.
 * Default L is 25 when cap is missing/invalid.
 */
export function formatShowCustomerLimitUserMessage(cap?: number | null): string {
  const safeCap = finitePositive(cap) ?? 25;
  return `You've used all ${safeCap} of your print spots on this show. Choose another show for more designs.`;
}
