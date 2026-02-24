import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const { data: notifications } = useQuery<any[]>({ queryKey: ["/api/notifications"], refetchInterval: 30000 });
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
