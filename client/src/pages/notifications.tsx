import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { db } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, ShoppingCart, TrendingUp, CreditCard, Truck, AlertTriangle, Clock, Trash2, CalendarClock } from "lucide-react";

const iconMap: Record<string, any> = {
  purchase: ShoppingCart,
  sale: TrendingUp,
  payment: CreditCard,
  rental_payment: CreditCard,
  rental: Truck,
  vehicle_alert: AlertTriangle,
  overdue: Clock,
  amount_due: CalendarClock,
};

const colorMap: Record<string, string> = {
  purchase: "bg-blue-100 text-blue-600",
  sale: "bg-green-100 text-green-600",
  payment: "bg-purple-100 text-purple-600",
  rental_payment: "bg-purple-100 text-purple-600",
  rental: "bg-orange-100 text-orange-600",
  vehicle_alert: "bg-yellow-100 text-yellow-600",
  overdue: "bg-red-100 text-red-600",
  amount_due: "bg-amber-100 text-amber-600",
};

function formatTimeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NOTIFICATIONS_QUERY_KEY = ["umugwaneza", "notifications_list"];

function parseNotificationsList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === "object") {
    const v = Object.values(data)[0];
    return Array.isArray(v) ? v : [];
  }
  return [];
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [clearOpen, setClearOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: notifications, isLoading, dataUpdatedAt } = useQuery<any[]>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await db().rpc("notifications_list", { p_limit: 50 });
      if (error) throw new Error(error.message);
      return parseNotificationsList(data);
    },
    refetchInterval: 30000,
  });
  const isLive = dataUpdatedAt ? Date.now() - dataUpdatedAt < 6000 : false;

  // Run due-date reminders once per day (at 10:00 AM Rwanda). Idempotent on server; refetch list after.
  useEffect(() => {
    let cancelled = false;
    db()
      .rpc("process_due_date_reminders")
      .then(({ error }) => {
        if (!cancelled && !error) queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db().rpc("notifications_clear_all");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      setClearOpen(false);
      toast({ title: t("notifications.cleared") });
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6 animate-page-fade">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]" data-testid="text-page-title">{t("notifications.title")}</h1>
          <p className="text-sm text-[#64748b]">{t("notifications.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge className="bg-green-600 text-white text-xs" data-testid="badge-live">Live</Badge>
          )}
          {notifications && notifications.length > 0 && (
            <Badge variant="secondary" className="text-sm" data-testid="badge-notification-count">
              {notifications.length} {t("notifications.items")}
            </Badge>
          )}
          {notifications && notifications.length > 0 && (
            <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-[#e2e8f0]" data-testid="button-clear-notifications">
                  <Trash2 className="h-4 w-4 mr-2" /> {t("notifications.clear_all")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("notifications.clear_all")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("notifications.clear_all_confirm")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearAllMutation.mutate()}
                    disabled={clearAllMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-clear-notifications-confirm"
                  >
                    {clearAllMutation.isPending ? t("common.loading") : t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !notifications?.length ? (
        <Card className="border border-[#e2e8f0] bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-[#64748b] mb-4" />
            <p className="text-[#1e293b] font-medium">{t("notifications.no_notifications")}</p>
            <p className="text-sm text-[#64748b]">{t("notifications.all_clear")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any, i: number) => {
            const Icon = iconMap[n.type] || Bell;
            const colorClass = colorMap[n.type] || "bg-gray-100 text-gray-600";
            const ts = n.created_at || n.timestamp;
            let href: string | null = null;
            if (n.entity_type === "purchase") href = "/purchases";
            else if (n.entity_type === "sale") href = "/sales";
            else if (n.entity_type === "grocery_payment" || n.entity_type === "rental_payment") href = "/payments";
            else if (n.entity_type === "rental_contract") href = "/rentals";
            return (
              <Card
                key={`${n.type}-${ts}-${i}`}
                className={`border border-[#e2e8f0] bg-white transition-all duration-200 hover:shadow-sm animate-row-slide ${href ? "cursor-pointer" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
                data-testid={`notification-${i}`}
                onClick={() => { if (href) setLocation(href); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1e293b] truncate">{n.title}</p>
                        <span className="text-xs text-[#64748b] whitespace-nowrap">{formatTimeAgo(ts)}</span>
                      </div>
                      <p className="text-sm text-[#64748b] mt-1">{n.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
