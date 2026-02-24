import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  Users,
  UserCheck,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Truck,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Bell,
  Building2,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isAdmin = user?.role === "SYSTEM_ADMIN";
  const displayName = isAdmin ? user?.admin_name : user?.owner_name;

  const ownerMenuGroups = [
    {
      label: t("nav.overview"),
      items: [
        { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: t("nav.grocery"),
      items: [
        { title: t("nav.items"), url: "/items", icon: Package },
        { title: t("nav.suppliers"), url: "/suppliers", icon: Users },
        { title: t("nav.customers"), url: "/customers", icon: UserCheck },
        { title: t("nav.purchases"), url: "/purchases", icon: ShoppingCart },
        { title: t("nav.sales"), url: "/sales", icon: TrendingUp },
        { title: t("nav.payments"), url: "/payments", icon: CreditCard },
      ],
    },
    {
      label: t("nav.fleet_rental"),
      items: [
        { title: t("nav.vehicles"), url: "/vehicles", icon: Truck },
        { title: t("nav.external_owners"), url: "/external-owners", icon: UserPlus },
        { title: t("nav.outgoing_rental"), url: "/rentals/outgoing", icon: ArrowUpRight },
        { title: t("nav.incoming_rental"), url: "/rentals/incoming", icon: ArrowDownLeft },
      ],
    },
    {
      label: t("nav.reporting"),
      items: [
        { title: t("nav.reports"), url: "/reports", icon: FileText },
        { title: t("nav.notifications"), url: "/notifications", icon: Bell },
      ],
    },
  ];

  const adminMenuItems = [
    { title: t("nav.create_business"), url: "/admin/businesses", icon: Building2 },
    { title: t("nav.create_owner"), url: "/admin/owners", icon: UserPlus },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2563eb]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#1e293b]" data-testid="text-company-name">{t("app.name")}</span>
            <span className="text-xs text-[#64748b]">{isAdmin ? t("auth.system_admin") : t("auth.business_owner")}</span>
          </div>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.administration")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild data-active={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.url.replace(/\//g, "-").slice(1)}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          ownerMenuGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild data-active={location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url))}>
                        <Link href={item.url} data-testid={`link-${item.url.replace(/\//g, "-").slice(1)}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      <Separator />
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-[#1e293b] truncate">{displayName}</span>
            <span className="text-xs text-[#64748b]">{isAdmin ? t("nav.admin") : t("nav.owner")}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
