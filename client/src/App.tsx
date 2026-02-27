import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import LandingPage from "@/pages/landing";
import RwandaWholesalePartnerPage from "@/pages/seo/rwanda-wholesale-partner";
import RwandaVehicleRentalPage from "@/pages/seo/rwanda-vehicle-rental";
import TrucksAndMachinesRentalRwandaPage from "@/pages/seo/trucks-and-machines-rental-rwanda";
import { initializeApp } from "@/lib/init";
import { usePageMeta } from "@/lib/usePageMeta";
import DashboardPage from "@/pages/dashboard";
import ItemsPage from "@/pages/items";
import SuppliersPage from "@/pages/suppliers";
import CustomersPage from "@/pages/customers";
import PurchasesPage from "@/pages/purchases";
import SalesPage from "@/pages/sales";
import PaymentsPage from "@/pages/payments";
import VehiclesPage from "@/pages/vehicles";
import ExternalOwnersPage from "@/pages/external-owners";
import RentalsPage from "@/pages/rentals";
import ReportsPage from "@/pages/reports";
import StockPage from "@/pages/stock";
import NotificationsPage from "@/pages/notifications";
import AdminBusinessesPage from "@/pages/admin-businesses";
import AdminOwnersPage from "@/pages/admin-owners";
import FleetCustomersPage from "@/pages/fleet-customers";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { Logo } from "@/components/logo";
import { Analytics } from "@vercel/analytics/react";

function OwnerRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/items" component={ItemsPage} />
      <Route path="/suppliers" component={SuppliersPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/purchases" component={PurchasesPage} />
      <Route path="/sales" component={SalesPage} />
      <Route path="/payments" component={PaymentsPage} />
      <Route path="/vehicles" component={VehiclesPage} />
      <Route path="/fleet/customers" component={FleetCustomersPage} />
      <Route path="/external-owners" component={ExternalOwnersPage} />
      <Route path="/rentals/outgoing">{() => <RentalsPage direction="OUTGOING" />}</Route>
      <Route path="/rentals/incoming">{() => <RentalsPage direction="INCOMING" />}</Route>
      <Route path="/reports" component={ReportsPage} />
      <Route path="/stock" component={StockPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
      <Route path="/:rest*">{() => <Redirect to="/dashboard" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admin/businesses" component={AdminBusinessesPage} />
      <Route path="/admin/owners" component={AdminOwnersPage} />
      <Route path="/admin">{() => <Redirect to="/admin/businesses" />}</Route>
      <Route path="/">{() => <Redirect to="/admin/businesses" />}</Route>
      <Route path="/:rest*">{() => <Redirect to="/admin/businesses" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "SYSTEM_ADMIN";

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen min-h-[100dvh] w-full bg-[#f8fafc]">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <header className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-[#e2e8f0] bg-white flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="touch-manipulation" />
              <Logo size="sm" inline decorative />
              <span className="text-sm font-medium text-[#1e293b] truncate">{t("app.name")}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <NotificationBell />
              <LanguageSwitcher />
            </div>
          </header>
          <main className="flex-1 overflow-auto min-h-0">
            <div className="animate-page-fade">
              {isAdmin ? <AdminRouter /> : <OwnerRouter />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  usePageMeta(location);

  useEffect(() => {
    if (isAuthenticated) {
      initializeApp();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#f8fafc] animate-in fade-in duration-200">
        <div className="h-12 w-12 rounded-full border-4 border-[#e2e8f0] border-t-[#2563eb] animate-spin" aria-hidden />
        <p className="text-sm text-[#64748b]">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location === "/login") return <LoginPage />;
    if (location === "/rwanda-wholesale-partner") return <RwandaWholesalePartnerPage />;
    if (location === "/rwanda-vehicle-rental") return <RwandaVehicleRentalPage />;
    if (location === "/trucks-and-machines-rental-rwanda") return <TrucksAndMachinesRentalRwandaPage />;
    if (location !== "/") return <Redirect to="/" />;
    return <LandingPage />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
          <Analytics />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
