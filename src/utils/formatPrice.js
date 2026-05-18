// src/utils/formatPrice.js
//
// Centralized currency formatter for all price displays in CampusConnect.
//
// Usage:
//   import { formatPrice } from '../utils/formatPrice';
//   formatPrice(20)      → "GH₵ 20.00"
//   formatPrice(1200)    → "GH₵ 1,200.00"
//   formatPrice(12.4)    → "GH₵ 12.40"
//   formatPrice(null)    → null   ← caller should show "Ask for price"
//   formatPrice("")      → null
//   formatPrice("abc")   → null
//
// NOTE: The GH₵ prefix is baked in here so every call site is identical.
// Do NOT manually prepend "GH₵" at the call site.

export function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  // en-GH locale produces comma-separated thousands and 2 decimal places.
  // toLocaleString is well-supported in all modern browsers (including Safari 14+).
  const formatted = number.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `GH₵ ${formatted}`;
}