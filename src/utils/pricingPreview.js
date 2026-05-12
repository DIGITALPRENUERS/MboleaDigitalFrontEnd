/**
 * Matches backend {@code SupplierOfferingPricing.effectivePriceTzs}: regulator × (1 − discount%/100), rounded to whole TZS.
 */
export function effectiveNetPriceTzs(regulatorTzs, discountPercent) {
  if (regulatorTzs == null || regulatorTzs === '') return null;
  const reg = Number(regulatorTzs);
  if (Number.isNaN(reg)) return null;
  const raw = discountPercent === '' || discountPercent == null ? 0 : Number(discountPercent);
  const pct = Number.isNaN(raw) || raw <= 0 ? 0 : raw;
  if (pct <= 0) return Math.round(reg);
  const mult = 1 - pct / 100;
  return Math.round(reg * mult);
}
