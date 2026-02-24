import { useLocation, Link } from "wouter";
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

const ownerMenuGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Grocery",
    items: [
      { title: "Items", url: "/items", icon: Package },
      { title: "Suppliers", url: "/suppliers", icon: Users },
      { title: "Customers", url: "/customers", icon: UserCheck },
      { title: "Purchases", url: "/purchases", icon: ShoppingCart },
      { title: "Sales", url: "/sales", icon: TrendingUp },
      { title: "Payments", url: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "Fleet & Rental",
    items: [
      { title: "Vehicles", url: "/vehicles", icon: Truck },
      { title: "External Owners", url: "/external-owners", icon: UserPlus },
      { title: "Outgoing Rental", url: "/rentals/outgoing", icon: ArrowUpRight },
      { title: "Incoming Rental", url: "/rentals/incoming", icon: ArrowDownLeft },
    ],
  },
  {
    label: "Reporting",
    items: [
      { title: "Reports", url: "/reports", icon: FileText },
    ],
  },
];

const adminMenuItems = [
  { title: "Create Business", url: "/admin/businesses", icon: Building2 },
  { title: "Create Owner", url: "/admin/owners", icon: UserPlus },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isAdmin = user?.role === "SYSTEM_ADMIN";
  const displayName = isAdmin ? user?.admin_name : user?.owner_name;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2563eb]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#1e293b]" data-testid="text-company-name">UMUGWANEZA LTD</span>
            <span className="text-xs text-[#64748b]">{isAdmin ? "System Admin" : "Business Owner"}</span>
          </div>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
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
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url))}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
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
            <span className="text-xs text-[#64748b]">{isAdmin ? "Admin" : "Owner"}</span>
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
