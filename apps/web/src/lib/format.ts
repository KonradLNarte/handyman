/**
 * Format money amount with Swedish formatting.
 * Space as thousands separator, comma as decimal.
 * Example: 45000 → "45 000,00 kr"
 */
export function formatSEK(amount: number): string {
  return (
    new Intl.NumberFormat("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " kr"
  );
}
