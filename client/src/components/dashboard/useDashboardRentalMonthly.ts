import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase";
import type { MonthlyRentalPoint } from "./types";

function parseMonthlyPayload(data: unknown): MonthlyRentalPoint[] {
  const raw = data as Record<string, unknown> | null;
  if (!raw || !Array.isArray(raw.rows)) return [];
  return (raw.rows as unknown[]).map((x: unknown) => {
    const row = x as Record<string, unknown>;
    return {
      month: String(row?.month ?? ""),
      totalIncome: Number(row?.totalIncome ?? 0),
      totalRentExpense: Number(row?.totalRentExpense ?? 0),
      totalMaintenanceExpense: Number(row?.totalMaintenanceExpense ?? 0),
      totalExpense: Number(row?.totalExpense ?? 0),
      profit: Number(row?.profit ?? 0),
    };
  });
}

export function useDashboardRentalMonthly(months: number = 12) {
  const query = useQuery({
    queryKey: ["dashboard", "rental_monthly", months],
    queryFn: async () => {
      const { data, error } = await db().rpc("dashboard_rental_monthly", { p_months: months });
      if (error) throw new Error(error.message);
      return parseMonthlyPayload(data);
    },
    staleTime: 60 * 1000,
  });
  return {
    ...query,
    monthly: query.data ?? [],
  };
}
