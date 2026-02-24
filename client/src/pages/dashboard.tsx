import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Truck, CheckCircle, ArrowUpRight, ArrowDownLeft, Wrench
} from "lucide-react";

function StatCard({ title, value, icon: Icon, subtitle, color = "#2563eb" }: {
  title: string; value: string | number; icon: any; subtitle?: string; color?: string;
}) {
  return (
    <Card className="border border-[#e2e8f0] bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-[#64748b]">{title}</span>
            <span className="text-2xl font-bold text-[#1e293b]" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</span>
            {subtitle && <span className="text-xs text-[#64748b]">{subtitle}</span>}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRWF(amount: number) {
  return new Intl.NumberFormat("en-RW").format(Math.round(amount)) + " RWF";
}

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: groceryStats, isLoading: loadingGrocery } = useQuery({
    queryKey: ["/api/dashboard/grocery"],
  });

  const { data: rentalStats, isLoading: loadingRental } = useQuery({
    queryKey: ["/api/dashboard/rental"],
  });

  if (loadingGrocery || loadingRental) {
    return (
      <div className="p-6 space-y-6 animate-page-fade">
        <h1 className="text-2xl font-bold text-[#1e293b]">{t("dashboard.title")}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-[#e2e8f0] bg-white">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const g = groceryStats as any || {};
  const r = rentalStats as any || {};

  return (
    <div className="p-6 space-y-8 animate-page-fade">
      <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("dashboard.title")}</h1>

      <div>
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">{t("dashboard.grocery_overview")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title={t("dashboard.active_items")} value={g.totalStock || 0} icon={Package} color="#2563eb" />
          <StatCard title={t("dashboard.today_sales")} value={formatRWF(g.todaySales || 0)} icon={TrendingUp} color="#16a34a" />
          <StatCard title={t("dashboard.monthly_sales")} value={formatRWF(g.monthlySales || 0)} icon={TrendingUp} color="#0891b2" />
          <StatCard title={t("dashboard.monthly_profit")} value={formatRWF(g.monthlyProfit || 0)} icon={DollarSign} color={(g.monthlyProfit || 0) >= 0 ? "#16a34a" : "#dc2626"} />
          <StatCard title={t("dashboard.outstanding_payables")} value={formatRWF(g.payables || 0)} icon={TrendingDown} color="#dc2626" />
          <StatCard title={t("dashboard.outstanding_receivables")} value={formatRWF(g.receivables || 0)} icon={AlertTriangle} color="#ea580c" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">{t("dashboard.fleet_overview")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard title={t("dashboard.total_vehicles")} value={r.total || 0} icon={Truck} color="#2563eb" />
          <StatCard title={t("dashboard.available")} value={r.available || 0} icon={CheckCircle} color="#16a34a" />
          <StatCard title={t("dashboard.rented_out")} value={r.rentedOut || 0} icon={ArrowUpRight} color="#0891b2" />
          <StatCard title={t("dashboard.rented_in")} value={r.rentedIn || 0} icon={ArrowDownLeft} color="#7c3aed" />
          <StatCard title={t("dashboard.maintenance")} value={r.maintenance || 0} icon={Wrench} color="#ea580c" />
          <StatCard title={t("dashboard.today_rental_revenue")} value={formatRWF(r.todayRevenue || 0)} icon={DollarSign} color="#16a34a" />
          <StatCard title={t("dashboard.monthly_rental_revenue")} value={formatRWF(r.monthRevenue || 0)} icon={TrendingUp} color="#0891b2" />
        </div>
      </div>
    </div>
  );
}
