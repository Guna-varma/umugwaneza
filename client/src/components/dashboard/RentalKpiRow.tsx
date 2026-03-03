import { useTranslation } from "react-i18next";
import {
  Truck,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Wrench,
  Banknote,
} from "lucide-react";
import { DashboardKpiCard } from "./DashboardKpiCard";
import type { RentalStats } from "./types";

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

export function RentalKpiRow({ rental }: { rental: RentalStats }) {
  const { t } = useTranslation();

  const monthProfit = Number(rental.monthProfit) ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        title={t("dashboard.vehicles_under_maintenance")}
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
        title={t("dashboard.monthly_rental_income")}
        value={formatRWF(Number(rental.monthRevenue) ?? 0)}
        icon={Banknote}
        color="#10b981"
        data-testid="text-stat-monthly-rental-income"
      />
      <DashboardKpiCard
        title={t("dashboard.monthly_rental_expense")}
        value={formatRWF(Number(rental.monthExpense) ?? 0)}
        icon={Banknote}
        color="#f43f5e"
        data-testid="text-stat-monthly-rental-expense"
      />
      <DashboardKpiCard
        title={t("dashboard.monthly_maintenance_expense")}
        value={formatRWF(Number(rental.monthMaintenanceExpense) ?? 0)}
        icon={Wrench}
        color="#eab308"
        data-testid="text-stat-monthly-maintenance-expense"
      />
      <DashboardKpiCard
        title={t("dashboard.maintenance_expense_ytd")}
        value={formatRWF(Number(rental.maintenanceExpenseYTD) ?? 0)}
        icon={Wrench}
        color="#ca8a04"
        data-testid="text-stat-maintenance-expense-ytd"
      />
      <DashboardKpiCard
        title={t("dashboard.monthly_rental_profit")}
        value={formatRWF(monthProfit)}
        icon={Banknote}
        color={monthProfit >= 0 ? "#10b981" : "#f43f5e"}
        data-testid="text-stat-monthly-rental-profit"
      />
    </div>
  );
}
