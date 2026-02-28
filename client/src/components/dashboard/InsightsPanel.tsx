import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import type { GroceryStats } from "./types";
import type { RentalStats } from "./types";

export function InsightsPanel({
  grocery,
  rental,
}: {
  grocery: GroceryStats;
  rental: RentalStats;
}) {
  const { t } = useTranslation();

  const monthlySales = Number(grocery.monthlySales) || 0;
  const monthlyProfit = Number(grocery.monthlyProfit) || 0;
  const payables = Number(grocery.payables) || 0;
  const receivables = Number(grocery.receivables) || 0;
  const monthRevenue = Number(rental.monthRevenue) || 0;
  const totalVehicles = Number(rental.total) || 0;
  const rentedOut = Number(rental.rentedOut) || 0;

  const points: string[] = [];
  if (monthlySales > 0) {
    points.push(
      t("dashboard.monthly_sales") +
        " at " +
        new Intl.NumberFormat("en-RW").format(Math.round(monthlySales)) +
        " RWF this month."
    );
  }
  if (monthlyProfit >= 0 && monthlyProfit > 0) {
    points.push("Grocery profit is positive this month.");
  } else if (monthlyProfit < 0) {
    points.push(
      "Grocery shows more purchases than sales this month; consider timing of stock intake."
    );
  }
  if (receivables > 0 || payables > 0) {
    points.push(
      "Outstanding: " +
        new Intl.NumberFormat("en-RW").format(Math.round(receivables)) +
        " RWF receivables, " +
        new Intl.NumberFormat("en-RW").format(Math.round(payables)) +
        " RWF payables."
    );
  }
  if (monthRevenue > 0) {
    points.push(
      "Rental revenue this month: " +
        new Intl.NumberFormat("en-RW").format(Math.round(monthRevenue)) +
        " RWF."
    );
  }
  if (totalVehicles > 0) {
    const util =
      totalVehicles > 0 ? Math.round((rentedOut / totalVehicles) * 100) : 0;
    points.push(
      totalVehicles +
        " vehicles in fleet; " +
        rentedOut +
        " currently rented out (" +
        util +
        "% utilization)."
    );
  }
  if (points.length === 0) {
    points.push("Add sales, purchases, and rentals to see insights here.");
  }

  return (
    <div className="dashboard-card p-5 border-amber-200/80">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-[#1e293b]">Summary</h3>
      </div>
      <ul className="space-y-2 text-sm text-[#475569] leading-relaxed">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-amber-500">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
