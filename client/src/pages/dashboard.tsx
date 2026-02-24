import { useQuery } from "@tanstack/react-query";
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
  const { data: groceryStats, isLoading: loadingGrocery } = useQuery({
    queryKey: ["/api/dashboard/grocery"],
  });

  const { data: rentalStats, isLoading: loadingRental } = useQuery({
    queryKey: ["/api/dashboard/rental"],
  });

  if (loadingGrocery || loadingRental) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Dashboard</h1>
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
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">Dashboard</h1>

      <div>
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">Grocery Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Active Items" value={g.totalStock || 0} icon={Package} color="#2563eb" />
          <StatCard title="Today Sales" value={formatRWF(g.todaySales || 0)} icon={TrendingUp} color="#16a34a" />
          <StatCard title="Monthly Sales" value={formatRWF(g.monthlySales || 0)} icon={TrendingUp} color="#0891b2" />
          <StatCard title="Monthly Profit" value={formatRWF(g.monthlyProfit || 0)} icon={DollarSign} color={(g.monthlyProfit || 0) >= 0 ? "#16a34a" : "#dc2626"} />
          <StatCard title="Outstanding Payables" value={formatRWF(g.payables || 0)} icon={TrendingDown} color="#dc2626" />
          <StatCard title="Outstanding Receivables" value={formatRWF(g.receivables || 0)} icon={AlertTriangle} color="#ea580c" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">Fleet & Rental Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard title="Total Vehicles" value={r.total || 0} icon={Truck} color="#2563eb" />
          <StatCard title="Available" value={r.available || 0} icon={CheckCircle} color="#16a34a" />
          <StatCard title="Rented Out" value={r.rentedOut || 0} icon={ArrowUpRight} color="#0891b2" />
          <StatCard title="Rented In" value={r.rentedIn || 0} icon={ArrowDownLeft} color="#7c3aed" />
          <StatCard title="Maintenance" value={r.maintenance || 0} icon={Wrench} color="#ea580c" />
          <StatCard title="Today Rental Revenue" value={formatRWF(r.todayRevenue || 0)} icon={DollarSign} color="#16a34a" />
          <StatCard title="Monthly Rental Revenue" value={formatRWF(r.monthRevenue || 0)} icon={TrendingUp} color="#0891b2" />
        </div>
      </div>
    </div>
  );
}
