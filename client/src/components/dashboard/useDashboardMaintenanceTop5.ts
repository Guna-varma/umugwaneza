import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/supabase";

export type TopMaintenanceRow = {
  id: string;
  vehicleId: string;
  vehicleName: string | null;
  startDate: string;
  cost: number | null;
  description: string | null;
  maintenanceType: string | null;
  vendorName: string | null;
  invoiceNumber: string | null;
};

function parsePayload(data: unknown): TopMaintenanceRow[] {
  const raw = data as Record<string, unknown> | null;
  if (!raw || !Array.isArray(raw.rows)) return [];
  return (raw.rows as unknown[]).map((x: unknown) => {
    const row = x as Record<string, unknown>;
    return {
      id: String(row?.id ?? ""),
      vehicleId: String(row?.vehicleId ?? ""),
      vehicleName: row?.vehicleName != null ? String(row.vehicleName) : null,
      startDate: String(row?.startDate ?? ""),
      cost: row?.cost != null ? Number(row.cost) : null,
      description: row?.description != null ? String(row.description) : null,
      maintenanceType: row?.maintenanceType != null ? String(row.maintenanceType) : null,
      vendorName: row?.vendorName != null ? String(row.vendorName) : null,
      invoiceNumber: row?.invoiceNumber != null ? String(row.invoiceNumber) : null,
    };
  });
}

export function useDashboardMaintenanceTop5() {
  const query = useQuery({
    queryKey: ["dashboard", "maintenance_top5"],
    queryFn: async () => {
      const { data, error } = await db().rpc("dashboard_maintenance_top5");
      if (error) throw new Error(error.message);
      return parsePayload(data);
    },
    staleTime: 60 * 1000,
  });
  return {
    ...query,
    top5: query.data ?? [],
  };
}
