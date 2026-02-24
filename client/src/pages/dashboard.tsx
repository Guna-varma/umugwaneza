import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Truck, CheckCircle, ArrowUpRight, ArrowDownLeft, Wrench
} from "lucide-react";

const BUSINESS_ID = "biz_001";

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
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const { data: groceryStats, isLoading: loadingGrocery } = useQuery({
    queryKey: ["/dashboard/grocery"],
    queryFn: async () => {
      const [itemsRes, todaySalesRes, monthlySalesRes, monthlyPurchasesRes, purchasesRes, salesRes] = await Promise.all([
        supabase.from("items").select("id", { count: "exact" }).eq("business_id", BUSINESS_ID).eq("is_active", true),
        supabase.from("sales").select("total_sale_amount").eq("business_id", BUSINESS_ID).eq("sale_date", today),
        supabase.from("sales").select("total_sale_amount").eq("business_id", BUSINESS_ID).gte("sale_date", monthStart),
        supabase.from("purchases").select("total_purchase_cost").eq("business_id", BUSINESS_ID).gte("purchase_date", monthStart),
        supabase.from("purchases").select("remaining_amount").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0),
        supabase.from("sales").select("remaining_amount").eq("business_id", BUSINESS_ID).gt("remaining_amount", 0),
      ]);

      const totalStock = itemsRes.count || 0;
      const todaySales = (todaySalesRes.data || []).reduce((s, r) => s + (r.total_sale_amount || 0), 0);
      const monthlySales = (monthlySalesRes.data || []).reduce((s, r) => s + (r.total_sale_amount || 0), 0);
      const monthlyPurchases = (monthlyPurchasesRes.data || []).reduce((s, r) => s + (r.total_purchase_cost || 0), 0);
      const payables = (purchasesRes.data || []).reduce((s, r) => s + (r.remaining_amount || 0), 0);
      const receivables = (salesRes.data || []).reduce((s, r) => s + (r.remaining_amount || 0), 0);

      return { totalStock, todaySales, monthlySales, monthlyProfit: monthlySales - monthlyPurchases, payables, receivables };
    },
  });

  const { data: rentalStats, isLoading: loadingRental } = useQuery({
    queryKey: ["/dashboard/rental"],
    queryFn: async () => {
      const [vehiclesRes, contractsTodayRes, contractsMonthRes] = await Promise.all([
        supabase.from("vehicles").select("current_status").eq("business_id", BUSINESS_ID),
        supabase.from("rental_contracts").select("rental_direction, total_amount").eq("business_id", BUSINESS_ID).eq("operational_status", "ACTIVE").gte("rental_start_datetime", today + "T00:00:00"),
        supabase.from("rental_contracts").select("rental_direction, total_amount").eq("business_id", BUSINESS_ID).gte("rental_start_datetime", monthStart + "T00:00:00"),
      ]);

      const vehicles = vehiclesRes.data || [];
      const total = vehicles.length;
      const available = vehicles.filter((v) => v.current_status === "AVAILABLE").length;
      const rentedOut = vehicles.filter((v) => v.current_status === "RENTED_OUT").length;
      const rentedIn = vehicles.filter((v) => v.current_status === "RENTED_IN").length;
      const maintenance = vehicles.filter((v) => v.current_status === "MAINTENANCE").length;

      const todayOut = (contractsTodayRes.data || []).filter(c => c.rental_direction === "OUTGOING").reduce((s, r) => s + (r.total_amount || 0), 0);
      const monthOut = (contractsMonthRes.data || []).filter(c => c.rental_direction === "OUTGOING").reduce((s, r) => s + (r.total_amount || 0), 0);

      return { total, available, rentedOut, rentedIn, maintenance, todayRevenue: todayOut, monthRevenue: monthOut };
    },
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

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">Dashboard</h1>

      <div>
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">Grocery Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Active Items" value={groceryStats?.totalStock || 0} icon={Package} color="#2563eb" />
          <StatCard title="Today Sales" value={formatRWF(groceryStats?.todaySales || 0)} icon={TrendingUp} color="#16a34a" />
          <StatCard title="Monthly Sales" value={formatRWF(groceryStats?.monthlySales || 0)} icon={TrendingUp} color="#0891b2" />
          <StatCard title="Monthly Profit" value={formatRWF(groceryStats?.monthlyProfit || 0)} icon={DollarSign} color={(groceryStats?.monthlyProfit || 0) >= 0 ? "#16a34a" : "#dc2626"} />
          <StatCard title="Outstanding Payables" value={formatRWF(groceryStats?.payables || 0)} icon={TrendingDown} color="#dc2626" />
          <StatCard title="Outstanding Receivables" value={formatRWF(groceryStats?.receivables || 0)} icon={AlertTriangle} color="#ea580c" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#1e293b] mb-4">Fleet & Rental Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard title="Total Vehicles" value={rentalStats?.total || 0} icon={Truck} color="#2563eb" />
          <StatCard title="Available" value={rentalStats?.available || 0} icon={CheckCircle} color="#16a34a" />
          <StatCard title="Rented Out" value={rentalStats?.rentedOut || 0} icon={ArrowUpRight} color="#0891b2" />
          <StatCard title="Rented In" value={rentalStats?.rentedIn || 0} icon={ArrowDownLeft} color="#7c3aed" />
          <StatCard title="Maintenance" value={rentalStats?.maintenance || 0} icon={Wrench} color="#ea580c" />
          <StatCard title="Today Rental Revenue" value={formatRWF(rentalStats?.todayRevenue || 0)} icon={DollarSign} color="#16a34a" />
          <StatCard title="Monthly Rental Revenue" value={formatRWF(rentalStats?.monthRevenue || 0)} icon={TrendingUp} color="#0891b2" />
        </div>
      </div>
    </div>
  );
}
