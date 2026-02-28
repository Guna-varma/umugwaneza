import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/supabase";
import {
  OverviewSection,
  GroceryKpiRow,
  RentalKpiRow,
  GroceryChartsSection,
  RentalChartsSection,
  useDashboardTrends,
  type GroceryStats,
  type RentalStats,
} from "@/components/dashboard";

export default function DashboardPage() {
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    db()
      .rpc("process_due_date_reminders")
      .then(({ error }) => {
        if (!cancelled && !error)
          queryClient.invalidateQueries({ queryKey: ["umugwaneza", "notifications_list"] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: groceryStats, isLoading: loadingGrocery } = useQuery({
    queryKey: ["dashboard", "grocery"],
    queryFn: async () => {
      const { data, error } = await db().rpc("dashboard_grocery");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: rentalStats, isLoading: loadingRental } = useQuery({
    queryKey: ["dashboard", "rental"],
    queryFn: async () => {
      const { data, error } = await db().rpc("dashboard_rental");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { trends } = useDashboardTrends();

  const grocery = (groceryStats as GroceryStats) || {};
  const rental = (rentalStats as RentalStats) || {};

  if (loadingGrocery || loadingRental) {
    return (
      <div className="dashboard-executive dashboard-bg min-h-screen p-6 animate-page-fade">
        <h1 className="dashboard-section-title text-2xl mb-6" data-testid="text-page-title">
          {t("dashboard.title")}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="dashboard-card border-card-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2 bg-white/10" />
                <Skeleton className="h-8 w-32 bg-white/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="dashboard-executive dashboard-bg min-h-screen p-4 sm:p-6 pb-12 animate-page-fade"
      data-testid="dashboard-page"
    >
      <header className="mb-8">
        <h1
          className="dashboard-section-title text-2xl sm:text-3xl tracking-tight text-[#1e293b]"
          data-testid="text-page-title"
        >
          {t("dashboard.title")}
        </h1>
        <p className="text-[#64748b] text-sm mt-1">
          Overview, grocery analytics, and rental analytics
        </p>
      </header>

      <section className="mb-12">
        <OverviewSection grocery={grocery} rental={rental} />
      </section>

      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#1e293b]">{t("dashboard.grocery_overview")}</h2>
          <p className="text-sm text-[#64748b] mt-0.5">Grocery KPIs and analytics</p>
        </div>
        <div className="space-y-6">
          <GroceryKpiRow grocery={grocery} />
          <GroceryChartsSection grocery={grocery} groceryDaily={trends.groceryDaily} />
        </div>
      </section>

      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#1e293b]">{t("dashboard.fleet_overview")}</h2>
          <p className="text-sm text-[#64748b] mt-0.5">Rental vehicles and machinery KPIs and analytics</p>
        </div>
        <div className="space-y-6">
          <RentalKpiRow rental={rental} />
          <RentalChartsSection
            rental={rental}
            rentalDaily={trends.rentalDaily}
            topVehicles={trends.topVehicles}
          />
        </div>
      </section>
    </div>
  );
}
