import { useEffect, useState } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "neutral";

export interface DashboardKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string; // e.g. #10b981
  trend?: TrendDirection;
  trendLabel?: string; // e.g. "+12% vs last month"
  className?: string;
  "data-testid"?: string;
}

function animateValue(
  from: number,
  to: number,
  durationMs: number,
  formatter: (n: number) => string,
  onUpdate: (s: string) => void
) {
  const start = performance.now();
  const update = (now: number) => {
    const elapsed = now - start;
    const t = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - t, 2);
    const current = Math.round(from + (to - from) * eased);
    onUpdate(formatter(current));
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

export function DashboardKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendLabel,
  className,
  "data-testid": dataTestId,
}: DashboardKpiCardProps) {
  const [displayValue, setDisplayValue] = useState<string | number>(value);
  const [mounted, setMounted] = useState(false);

  const isNumeric =
    typeof value === "number" ||
    (typeof value === "string" && /^[\d,.\s]+RWF$|^\d+$/.test(value.replace(/\s/g, "")));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isNumeric) {
      setDisplayValue(value);
      return;
    }
    const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, "")) || 0;
    if (Number.isNaN(num)) {
      setDisplayValue(value);
      return;
    }
    const fmt = typeof value === "string" && value.includes("RWF")
      ? (n: number) => new Intl.NumberFormat("en-RW").format(Math.round(n)) + " RWF"
      : (n: number) => String(n);
    animateValue(0, num, 600, fmt, setDisplayValue);
  }, [value, mounted, isNumeric]);

  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  const trendColor =
    trend === "up" ? "text-[#10b981]" : trend === "down" ? "text-[#f43f5e]" : "text-[#64748b]";

  return (
    <div
      className={cn(
        "dashboard-card p-5 flex flex-col gap-3",
        className
      )}
      data-testid={dataTestId}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-[#64748b]">{title}</span>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${color}18`,
            color,
            boxShadow: `0 0 20px -4px ${color}40`,
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className="dashboard-kpi-value text-2xl sm:text-3xl text-[#1e293b]"
          style={{ animation: "dashboard-count-up 0.4s ease-out" }}
        >
          {displayValue}
        </span>
        {trendLabel && (
          <span className={cn("text-xs font-medium flex items-center gap-0.5", trendColor)}>
            {trendIcon && <span>{trendIcon}</span>}
            {trendLabel}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-[#64748b] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
