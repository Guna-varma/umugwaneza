import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-card p-5 flex flex-col", className)}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#1e293b]">{title}</h3>
        {subtitle && <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-[240px]">{children}</div>
    </div>
  );
}
