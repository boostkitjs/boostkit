// Money formatting via Intl.NumberFormat — no third-party money lib.
//
// Paddle returns amounts as STRINGS in minor units (cents, etc.). Never
// `Number()` for arithmetic; keep as string/BigInt. This helper is for display
// only — it divides by the currency's minor-unit scale and formats with the
// caller's (or `Cashier.currencyLocale()`'s) locale.
//
// FUTURE: This file extracts to `@rudderjs/cashier` verbatim.

import { Cashier } from './Cashier.js'

// Currencies whose minor unit isn't 100. Source: ISO 4217.
const MINOR_UNITS: Record<string, number> = {
  // 0 minor units (whole currency only)
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0, PYG: 0,
  RWF: 0, UGX: 0, UYI: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  // 3 minor units
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  // (Most currencies are 2, the default.)
}

function scale(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2
}

/**
 * Format a Paddle minor-units amount for display.
 *
 * @param amountMinorUnits  Paddle's amount string ('1999' → $19.99 USD).
 * @param currency          ISO 4217 code from the same payload.
 * @param locale            BCP-47 locale; defaults to `Cashier.currencyLocale()`.
 *
 * @example
 *   formatAmount('1999', 'USD')        // "$19.99"
 *   formatAmount('1999', 'EUR', 'de')  // "19,99 €"
 *   formatAmount('19000', 'JPY')       // "¥19,000"
 */
export function formatAmount(
  amountMinorUnits: string | number,
  currency: string,
  locale?: string,
): string {
  const code      = currency.toUpperCase()
  const minor     = scale(code)
  const lcl       = locale ?? Cashier.currencyLocale()

  // Convert minor units → major as a Number for Intl. Safe up to 2^53;
  // amounts beyond that are vanishingly rare for human-readable currency.
  const raw = typeof amountMinorUnits === 'string' ? amountMinorUnits : String(amountMinorUnits)
  const parsed = Number(raw)
  const amount = Number.isFinite(parsed) ? parsed / Math.pow(10, minor) : 0

  return new Intl.NumberFormat(lcl, {
    style:    'currency',
    currency: code,
  }).format(amount)
}
