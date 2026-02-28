import { useTranslation } from "react-i18next";
import { TrendingUp, Banknote, Truck } from "lucide-react";
import { DashboardKpiCard } from "./DashboardKpiCard";
import { InsightsPanel } from "./InsightsPanel";
import type { GroceryStats } from "./types";
import type { RentalStats } from "./types";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

export function OverviewSection({
  grocery,
  rental,
}: {
  grocery: GroceryStats;
  rental: RentalStats;
}) {
  const { t } = useTranslation();
  const monthlyProfit = Number(grocery.monthlyProfit) ?? 0;
  const profitTrend = monthlyProfit >= 0 ? "up" : "down";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1e293b]">Overview</h2>
        <p className="text-sm text-[#64748b] mt-0.5">Key metrics across grocery and rental</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          title={t("dashboard.monthly_sales")}
          value={formatRWF(Number(grocery.monthlySales) ?? 0)}
          icon={TrendingUp}
          color="#06b6d4"
          data-testid="text-stat-overview-monthly-sales"
        />
        <DashboardKpiCard
          title={t("dashboard.monthly_profit")}
          value={formatRWF(monthlyProfit)}
          icon={Banknote}
          color={monthlyProfit >= 0 ? "#10b981" : "#f43f5e"}
          trend={profitTrend}
          trendLabel={monthlyProfit >= 0 ? "vs purchases" : "vs purchases"}
          data-testid="text-stat-overview-monthly-profit"
        />
        <DashboardKpiCard
          title={t("dashboard.total_vehicles")}
          value={rental.total ?? 0}
          icon={Truck}
          color="#3b82f6"
          data-testid="text-stat-overview-total-vehicles"
        />
        <DashboardKpiCard
          title={t("dashboard.monthly_rental_revenue")}
          value={formatRWF(Number(rental.monthRevenue) ?? 0)}
          icon={Banknote}
          color="#10b981"
          data-testid="text-stat-overview-monthly-rental-revenue"
        />
      </div>
      <InsightsPanel grocery={grocery} rental={rental} />
    </section>
  );
}
