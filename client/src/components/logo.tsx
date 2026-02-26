import { cn } from "@/lib/utils";

const LOGO_ALT = "Umugwaneza – B2B partnership and operations logo";

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
  xl: "h-12 w-12 sm:h-14 sm:w-14",
};

interface LogoProps {
  size?: LogoSize;
  className?: string;
  /** Prefer inline (no wrapper) for header/sidebar to avoid extra spacing */
  inline?: boolean;
  /** Use for decorative logo next to text; hides from screen readers */
  decorative?: boolean;
}

/**
 * Umugwaneza logo – handshake and gear, B2B branding.
 * Use consistent sizes and alt text for accessibility and no layout shift.
 */
export function Logo({ size = "md", className, inline, decorative }: LogoProps) {
  const img = (
    <img
      src="/logo.png"
      alt={decorative ? "" : LOGO_ALT}
      width={size === "xl" ? 56 : size === "lg" ? 40 : size === "sm" ? 32 : size === "xs" ? 24 : 36}
      height={size === "xl" ? 56 : size === "lg" ? 40 : size === "sm" ? 32 : size === "xs" ? 24 : 36}
      className={cn("object-contain flex-shrink-0", sizeClasses[size], className)}
      loading="eager"
      fetchPriority="high"
      {...(decorative && { "aria-hidden": true })}
    />
  );
  if (inline) return img;
  return <span className="inline-flex items-center justify-center">{img}</span>;
}

export { LOGO_ALT };
