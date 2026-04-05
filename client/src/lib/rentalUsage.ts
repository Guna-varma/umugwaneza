/**
 * Per calendar-day RWF equivalent for display (matches billing: month uses rate/30 per day unit).
 * Hourly contracts have no single "per day" rent — returns null.
 */
export function perDayEquivalentRwf(rate: number, rentalType: string | null | undefined): number | null {
  const r = Number(rate) || 0;
  if (r <= 0) return null;
  const rt = rentalType || "DAY";
  if (rt === "MONTH") return r / 30;
  if (rt === "DAY") return r;
  return null;
}

/** Mirrors umugwaneza.rental_usage_line_charge in SQL */
export function rentalUsageLineCharge(
  rentalType: string | null | undefined,
  rate: number,
  dayFraction: number,
  machineHours: number | null | undefined,
): number {
  const r = rate || 0;
  if (r <= 0) return 0;
  const rt = rentalType || "DAY";
  if (rt === "HOUR") return r * (machineHours ?? 0);
  if (rt === "MONTH") return r * (dayFraction / 30);
  return r * dayFraction;
}
