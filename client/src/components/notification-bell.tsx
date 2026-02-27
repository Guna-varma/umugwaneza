import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { db } from "@/lib/supabase";

function parseNotificationsList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === "object") {
    const v = Object.values(data)[0];
    return Array.isArray(v) ? v : [];
  }
  return [];
}

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const { data: notifications } = useQuery<any[]>({
    queryKey: ["umugwaneza", "notifications_list"],
    queryFn: async () => {
      const { data, error } = await db().rpc("notifications_list", { p_limit: 50 });
      if (error) throw new Error(error.message);
      return parseNotificationsList(data);
    },
    refetchInterval: 30000,
  });
  const count = notifications?.length || 0;

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => setLocation("/notifications")} data-testid="button-notification-bell">
      <Bell className="h-5 w-5 text-[#64748b]" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#2563eb] text-white text-[10px] flex items-center justify-center font-bold" data-testid="badge-notification-count">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
