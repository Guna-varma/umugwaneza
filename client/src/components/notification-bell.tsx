import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { db } from "@/lib/supabase";

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const { data: notifications } = useQuery<any[]>({
    queryKey: ["umugwaneza", "recent_activity"],
    queryFn: async () => {
      const { data, error } = await db().rpc("get_recent_activity", { p_limit: 50 }).single();
      if (error) throw new Error(error.message);
      const list = data != null && typeof data === "object" && !Array.isArray(data) ? (Object.values(data)[0] as any) : data;
      return Array.isArray(list) ? list : [];
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
