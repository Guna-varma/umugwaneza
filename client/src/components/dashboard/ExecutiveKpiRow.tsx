import { useTranslation } from "react-i18next";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Banknote,
  AlertTriangle,
  Truck,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Wrench,
} from "lucide-react";
import { DashboardKpiCard } from "./DashboardKpiCard";
import type { GroceryStats } from "./types";
import type { RentalStats } from "./types";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

export function ExecutiveKpiRow({
  grocery,
  rental,
}: {
  grocery: GroceryStats;
  rental: RentalStats;
}) {
  const { t } = useTranslation();

  const monthlyProfit = Number(grocery.monthlyProfit) ?? 0;
  const profitTrend = monthlyProfit >= 0 ? "up" : "down";
  const profitTrendLabel = monthlyProfit >= 0 ? "vs purchases" : "vs last month";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <DashboardKpiCard
        title={t("dashboard.active_items")}
        value={grocery.totalStock ?? 0}
        icon={Package}
        color="#3b82f6"
        data-testid="text-stat-active-items"
      />
      <DashboardKpiCard
        title={t("dashboard.today_sales")}
        value={formatRWF(Number(grocery.todaySales) ?? 0)}
        icon={TrendingUp}
        color="#10b981"
        data-testid="text-stat-today-sales"
      />
      <DashboardKpiCard
        title={t("dashboard.monthly_sales")}
        value={formatRWF(Number(grocery.monthlySales) ?? 0)}
        icon={TrendingUp}
        color="#06b6d4"
        data-testid="text-stat-monthly-sales"
      />
      <DashboardKpiCard
        title={t("dashboard.monthly_profit")}
        value={formatRWF(monthlyProfit)}
        icon={Banknote}
        color={monthlyProfit >= 0 ? "#10b981" : "#f43f5e"}
        trend={profitTrend}
        trendLabel={profitTrendLabel}
        subtitle={t("dashboard.monthly_profit_hint")}
        data-testid="text-stat-monthly-profit"
      />
      <DashboardKpiCard
        title={t("dashboard.outstanding_payables")}
        value={formatRWF(Number(grocery.payables) ?? 0)}
        icon={TrendingDown}
        color="#f43f5e"
        data-testid="text-stat-payables"
      />
      <DashboardKpiCard
        title={t("dashboard.outstanding_receivables")}
        value={formatRWF(Number(grocery.receivables) ?? 0)}
        icon={AlertTriangle}
        color="#eab308"
        data-testid="text-stat-receivables"
      />
      <DashboardKpiCard
        title={t("dashboard.total_vehicles")}
        value={rental.total ?? 0}
        icon={Truck}
        color="#3b82f6"
        data-testid="text-stat-total-vehicles"
      />
      <DashboardKpiCard
        title={t("dashboard.available")}
        value={rental.available ?? 0}
        icon={CheckCircle}
        color="#10b981"
        data-testid="text-stat-available"
      />
      <DashboardKpiCard
        title={t("dashboard.rented_out")}
        value={rental.rentedOut ?? 0}
        icon={ArrowUpRight}
        color="#06b6d4"
        data-testid="text-stat-rented-out"
      />
      <DashboardKpiCard
        title={t("dashboard.rented_in")}
        value={rental.rentedIn ?? 0}
        icon={ArrowDownLeft}
        color="#8b5cf6"
        data-testid="text-stat-rented-in"
      />
      <DashboardKpiCard
        title={t("dashboard.maintenance")}
        value={rental.maintenance ?? 0}
        icon={Wrench}
        color="#eab308"
        data-testid="text-stat-maintenance"
      />
      <DashboardKpiCard
        title={t("dashboard.today_rental_revenue")}
        value={formatRWF(Number(rental.todayRevenue) ?? 0)}
        icon={Banknote}
        color="#10b981"
        data-testid="text-stat-today-rental-revenue"
      />
      <DashboardKpiCard
        title={t("dashboard.monthly_rental_revenue")}
        value={formatRWF(Number(rental.monthRevenue) ?? 0)}
        icon={Banknote}
        color="#06b6d4"
        data-testid="text-stat-monthly-rental-revenue"
      />
    </div>
  );
}
