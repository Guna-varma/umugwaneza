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
