import { endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";

export type RentalUsageDetailRow = {
  contractId: string;
  date: string;
  vehicle: string;
  customer: string;
  dayUnits: number;
  hours: number;
  charge: number;
  notes: string;
};

export type RentalUsagePeriodRow = {
  periodKey: string;
  periodLabel: string;
  vehicle: string;
  customer: string;
  contractCount: number;
  entries: number;
  dayUnits: number;
  hours: number;
  charge: number;
};

export type RentalUsageBreakdownRow = {
  label: string;
  entries: number;
  contractCount: number;
  dayUnits: number;
  hours: number;
  charge: number;
  avgChargePerEntry: number;
};

export type RentalUsageExecutiveSummary = {
  totalCharge: number;
  totalDayUnits: number;
  totalHours: number;
  totalEntries: number;
  contractCount: number;
  vehicleCount: number;
  customerCount: number;
  averageChargePerEntry: number;
  averageChargePerDayUnit: number;
  topVehicleLabel: string;
  topVehicleCharge: number;
  topCustomerLabel: string;
  topCustomerCharge: number;
};

function sortByPeriodThenValue<T extends { periodKey: string; charge: number; vehicle: string; customer: string }>(rows: T[]) {
  return rows.sort((a, b) => {
    if (a.periodKey !== b.periodKey) {
      return a.periodKey.localeCompare(b.periodKey);
    }
    if (b.charge !== a.charge) {
      return b.charge - a.charge;
    }
    if (a.vehicle !== b.vehicle) {
      return a.vehicle.localeCompare(b.vehicle);
    }
    return a.customer.localeCompare(b.customer);
  });
}

function groupPeriodRows(
  rows: RentalUsageDetailRow[],
  getPeriodMeta: (date: string) => { key: string; label: string },
) {
  const grouped = new Map<
    string,
    {
      periodKey: string;
      periodLabel: string;
      vehicle: string;
      customer: string;
      contractIds: Set<string>;
      entries: number;
      dayUnits: number;
      hours: number;
      charge: number;
    }
  >();

  for (const row of rows) {
    const period = getPeriodMeta(row.date);
    const key = `${period.key}__${row.vehicle}__${row.customer}`;
    const existing = grouped.get(key) ?? {
      periodKey: period.key,
      periodLabel: period.label,
      vehicle: row.vehicle,
      customer: row.customer,
      contractIds: new Set<string>(),
      entries: 0,
      dayUnits: 0,
      hours: 0,
      charge: 0,
    };

    existing.contractIds.add(row.contractId);
    existing.entries += 1;
    existing.dayUnits += row.dayUnits;
    existing.hours += row.hours;
    existing.charge += row.charge;
    grouped.set(key, existing);
  }

  return sortByPeriodThenValue(
    Array.from(grouped.values()).map((row) => ({
      periodKey: row.periodKey,
      periodLabel: row.periodLabel,
      vehicle: row.vehicle,
      customer: row.customer,
      contractCount: row.contractIds.size,
      entries: row.entries,
      dayUnits: row.dayUnits,
      hours: row.hours,
      charge: row.charge,
    })),
  );
}

function buildBreakdown(rows: RentalUsageDetailRow[], getLabel: (row: RentalUsageDetailRow) => string): RentalUsageBreakdownRow[] {
  const grouped = new Map<
    string,
    {
      label: string;
      entries: number;
      dayUnits: number;
      hours: number;
      charge: number;
      contractIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const label = getLabel(row);
    const existing = grouped.get(label) ?? {
      label,
      entries: 0,
      dayUnits: 0,
      hours: 0,
      charge: 0,
      contractIds: new Set<string>(),
    };

    existing.entries += 1;
    existing.dayUnits += row.dayUnits;
    existing.hours += row.hours;
    existing.charge += row.charge;
    existing.contractIds.add(row.contractId);
    grouped.set(label, existing);
  }

  return Array.from(grouped.values())
    .map((row) => ({
      label: row.label,
      entries: row.entries,
      contractCount: row.contractIds.size,
      dayUnits: row.dayUnits,
      hours: row.hours,
      charge: row.charge,
      avgChargePerEntry: row.entries > 0 ? row.charge / row.entries : 0,
    }))
    .sort((a, b) => b.charge - a.charge || a.label.localeCompare(b.label));
}

export function buildWeeklyRentalReportRows(rows: RentalUsageDetailRow[]) {
  return groupPeriodRows(rows, (date) => {
    const parsed = parseISO(date);
    const start = startOfWeek(parsed, { weekStartsOn: 1 });
    const end = endOfWeek(parsed, { weekStartsOn: 1 });
    return {
      key: format(start, "yyyy-MM-dd"),
      label: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
    };
  });
}

export function buildMonthlyRentalReportRows(rows: RentalUsageDetailRow[]) {
  return groupPeriodRows(rows, (date) => {
    const parsed = parseISO(date);
    const monthStart = startOfMonth(parsed);
    return {
      key: format(monthStart, "yyyy-MM"),
      label: format(monthStart, "MMMM yyyy"),
    };
  });
}

export function buildVehicleBreakdownRows(rows: RentalUsageDetailRow[]) {
  return buildBreakdown(rows, (row) => row.vehicle);
}

export function buildCustomerBreakdownRows(rows: RentalUsageDetailRow[]) {
  return buildBreakdown(rows, (row) => row.customer);
}

export function buildRentalUsageExecutiveSummary(rows: RentalUsageDetailRow[]): RentalUsageExecutiveSummary {
  const totalCharge = rows.reduce((sum, row) => sum + row.charge, 0);
  const totalDayUnits = rows.reduce((sum, row) => sum + row.dayUnits, 0);
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const totalEntries = rows.length;
  const contractCount = new Set(rows.map((row) => row.contractId)).size;
  const vehicleBreakdown = buildVehicleBreakdownRows(rows);
  const customerBreakdown = buildCustomerBreakdownRows(rows);

  return {
    totalCharge,
    totalDayUnits,
    totalHours,
    totalEntries,
    contractCount,
    vehicleCount: vehicleBreakdown.length,
    customerCount: customerBreakdown.length,
    averageChargePerEntry: totalEntries > 0 ? totalCharge / totalEntries : 0,
    averageChargePerDayUnit: totalDayUnits > 0 ? totalCharge / totalDayUnits : 0,
    topVehicleLabel: vehicleBreakdown[0]?.label ?? "—",
    topVehicleCharge: vehicleBreakdown[0]?.charge ?? 0,
    topCustomerLabel: customerBreakdown[0]?.label ?? "—",
    topCustomerCharge: customerBreakdown[0]?.charge ?? 0,
  };
}
