import { useTranslation } from "react-i18next";
import { Wrench, DollarSign, Car, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardKpiCard } from "./DashboardKpiCard";
import { useDashboardMaintenanceTop5 } from "./useDashboardMaintenanceTop5";
import { useReportMaintenanceMonthly } from "./useReportMaintenanceMonthly";
import type { RentalStats } from "./types";

function formatRWF(n: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(n)) + " RWF";
}

export function MaintenanceDashboardSection({ rental }: { rental: RentalStats }) {
  const { t } = useTranslation();
  const { top5, isLoading: top5Loading } = useDashboardMaintenanceTop5();
  const { rows: monthlyReport } = useReportMaintenanceMonthly(6);

  const underMaintenance = Number(rental.maintenance) ?? 0;
  const monthCost = Number(rental.monthMaintenanceExpense) ?? 0;
  const recordCount = Math.max(1, Number(rental.maintenanceRecordCountMonth) ?? 0);
  const avgCost = monthCost / recordCount;
  const downtimeDays = Number(rental.maintenanceDowntimeDaysMonth) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          title={t("dashboard.vehicles_under_maintenance")}
          value={underMaintenance}
          icon={Car}
          color="#ef4444"
          data-testid="maintenance-stat-under-maintenance"
        />
        <DashboardKpiCard
          title={t("dashboard.total_maintenance_cost_this_month")}
          value={formatRWF(monthCost)}
          icon={DollarSign}
          color="#eab308"
          data-testid="maintenance-stat-month-cost"
        />
        <DashboardKpiCard
          title={t("dashboard.avg_maintenance_cost_per_vehicle")}
          value={formatRWF(avgCost)}
          icon={Wrench}
          color="#ca8a04"
          data-testid="maintenance-stat-avg-cost"
        />
        <DashboardKpiCard
          title={t("dashboard.total_downtime_this_month")}
          value={downtimeDays}
          icon={Clock}
          color="#64748b"
          data-testid="maintenance-stat-downtime"
        />
      </div>

      <Card className="border border-[#e2e8f0] bg-white">
        <CardContent className="p-0">
          <div className="p-4 border-b border-[#e2e8f0]">
            <h3 className="font-semibold text-[#1e293b]">{t("dashboard.top_5_expensive_maintenance")}</h3>
          </div>
          {top5Loading ? (
            <div className="p-6 text-sm text-[#64748b]">Loading…</div>
          ) : !top5.length ? (
            <div className="p-6 text-sm text-[#64748b]">{t("maintenance.no_maintenance_records")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">{t("maintenance.vehicle")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("maintenance.date")}</TableHead>
                  <TableHead className="text-[#64748b]">{t("maintenance.type")}</TableHead>
                  <TableHead className="text-[#64748b] text-right">{t("maintenance.cost")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top5.map((row) => (
                  <TableRow key={row.id} className="border-b border-[#e2e8f0]">
                    <TableCell className="font-medium text-[#1e293b]">{row.vehicleName ?? row.vehicleId}</TableCell>
                    <TableCell className="text-[#64748b]">{row.startDate}</TableCell>
                    <TableCell className="text-[#64748b]">{row.maintenanceType ?? "—"}</TableCell>
                    <TableCell className="text-right text-[#1e293b]">{row.cost != null ? formatRWF(row.cost) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {monthlyReport.length > 0 && (
        <Card className="border border-[#e2e8f0] bg-white">
          <CardContent className="p-0">
            <div className="p-4 border-b border-[#e2e8f0]">
              <h3 className="font-semibold text-[#1e293b]">Monthly maintenance report (last 6 months)</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e2e8f0]">
                  <TableHead className="text-[#64748b]">Month</TableHead>
                  <TableHead className="text-[#64748b] text-right">Cost (RWF)</TableHead>
                  <TableHead className="text-[#64748b] text-right">Downtime (days)</TableHead>
                  <TableHead className="text-[#64748b] text-right">Vehicles under maintenance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...monthlyReport].reverse().map((row) => (
                  <TableRow key={row.month} className="border-b border-[#e2e8f0]">
                    <TableCell className="text-[#1e293b]">{row.month}</TableCell>
                    <TableCell className="text-right text-[#1e293b]">{formatRWF(row.totalMaintenanceCost)}</TableCell>
                    <TableCell className="text-right text-[#64748b]">{row.totalDowntimeDays}</TableCell>
                    <TableCell className="text-right text-[#64748b]">{row.vehicleCountUnderMaintenance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
