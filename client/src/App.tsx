import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import LandingPage from "@/pages/landing";
import { initializeApp } from "@/lib/init";
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
import NotificationsPage from "@/pages/notifications";
import AdminBusinessesPage from "@/pages/admin-businesses";
import AdminOwnersPage from "@/pages/admin-owners";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";

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
      <Route path="/external-owners" component={ExternalOwnersPage} />
      <Route path="/rentals/outgoing">{() => <RentalsPage direction="OUTGOING" />}</Route>
      <Route path="/rentals/incoming">{() => <RentalsPage direction="INCOMING" />}</Route>
      <Route path="/reports" component={ReportsPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admin/businesses" component={AdminBusinessesPage} />
      <Route path="/admin/owners" component={AdminOwnersPage} />
      <Route path="/">{() => <Redirect to="/admin/businesses" />}</Route>
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
      <div className="flex h-screen w-full bg-[#f8fafc]">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#e2e8f0] bg-white">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm font-medium text-[#1e293b]">{t("app.name")}</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LanguageSwitcher />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
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
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      initializeApp();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    if (location === "/login") {
      return <LoginPage />;
    }
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={LandingPage} />
      </Switch>
    );
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
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
