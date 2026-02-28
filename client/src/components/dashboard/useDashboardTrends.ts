import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase";
import type { DashboardTrends, DailyGroceryPoint, DailyRentalPoint, VehicleRevenueRow } from "./types";

function parseTrendsPayload(data: unknown): DashboardTrends {
  const raw = data as Record<string, unknown> | null;
  if (!raw) {
    return { groceryDaily: [], rentalDaily: [], topVehicles: [] };
  }
  const groceryDaily = (raw.groceryDaily as unknown[])?.map((x: unknown) => {
    const row = x as Record<string, unknown>;
    return {
      date: String(row?.date ?? ""),
      sales: Number(row?.sales ?? 0),
      purchases: Number(row?.purchases ?? 0),
      profit: Number(row?.profit ?? 0),
    };
  }) ?? [];
  const rentalDaily = (raw.rentalDaily as unknown[])?.map((x: unknown) => {
    const row = x as Record<string, unknown>;
    return {
      date: String(row?.date ?? ""),
      revenue: Number(row?.revenue ?? 0),
    };
  }) ?? [];
  const topVehicles = (raw.topVehicles as unknown[])?.map((x: unknown) => {
    const row = x as Record<string, unknown>;
    return {
      vehicleId: String(row?.vehicleId ?? ""),
      vehicleName: String(row?.vehicleName ?? ""),
      revenue: Number(row?.revenue ?? 0),
      contractCount: Number(row?.contractCount ?? 0),
    };
  }) ?? [];
  return {
    groceryDaily: groceryDaily as DailyGroceryPoint[],
    rentalDaily: rentalDaily as DailyRentalPoint[],
    topVehicles: topVehicles as VehicleRevenueRow[],
  };
}

const emptyTrends = (): DashboardTrends => ({
  groceryDaily: [],
  rentalDaily: [],
  topVehicles: [],
});

export function useDashboardTrends() {
  const query = useQuery({
    queryKey: ["dashboard", "trends"],
    queryFn: async () => {
      try {
        const { data, error } = await db().rpc("dashboard_trends");
        if (error) return emptyTrends();
        return parseTrendsPayload(data);
      } catch {
        return emptyTrends();
      }
    },
    staleTime: 60 * 1000,
  });

  return {
    ...query,
    trends: query.data ?? emptyTrends(),
  };
}
