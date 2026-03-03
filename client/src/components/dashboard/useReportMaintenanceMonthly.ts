import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase";

export type MaintenanceMonthlyRow = {
  month: string;
  totalMaintenanceCost: number;
  totalDowntimeDays: number;
  vehicleCountUnderMaintenance: number;
};

function parsePayload(data: unknown): MaintenanceMonthlyRow[] {
  const raw = data as Record<string, unknown> | null;
  if (!raw || !Array.isArray(raw.rows)) return [];
  return (raw.rows as unknown[]).map((x: unknown) => {
    const row = x as Record<string, unknown>;
    return {
      month: String(row?.month ?? ""),
      totalMaintenanceCost: Number(row?.totalMaintenanceCost ?? 0),
      totalDowntimeDays: Number(row?.totalDowntimeDays ?? 0),
      vehicleCountUnderMaintenance: Number(row?.vehicleCountUnderMaintenance ?? 0),
    };
  });
}

export function useReportMaintenanceMonthly(months: number = 12) {
  const query = useQuery({
    queryKey: ["dashboard", "report_maintenance_monthly", months],
    queryFn: async () => {
      const { data, error } = await db().rpc("report_maintenance_monthly", { p_months: months });
      if (error) throw new Error(error.message);
      return parsePayload(data);
    },
    staleTime: 60 * 1000,
  });
  return {
    ...query,
    rows: query.data ?? [],
  };
}
