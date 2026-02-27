"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Format number with thousand separators (e.g. 750000 → "750,000"). */
function formatWithCommas(value: number): string {
  if (value === 0 || value === undefined || value === null || Number.isNaN(value)) return "";
  const s = String(value);
  const [intPart, decPart] = s.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

/** Parse string (with or without commas) to number. */
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return 0;
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

/** Allow only digits, one decimal point, and optional minus. */
function sanitizeNumericInput(raw: string, allowDecimals: boolean): string {
  let out = raw.replace(/,/g, "");
  if (allowDecimals) {
    const parts = out.split(".");
    if (parts.length > 2) out = parts[0] + "." + parts.slice(1).join("");
  } else {
    out = out.replace(/\./g, "");
  }
  out = out.replace(/[^\d.-]/g, "");
  const minusCount = (out.match(/-/g) || []).length;
  if (minusCount > 1) out = out.replace(/-/g, "");
  else if (minusCount === 1 && !out.startsWith("-")) out = out.replace(/-/g, "");
  return out;
}

export interface AmountInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  onBlur?: () => void;
}

/**
 * Amount/payment input that displays with thousand separators (e.g. 750,000).
 * When focused, shows raw digits for editing; when blurred, shows formatted.
 */
export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, step, placeholder = "0", className, min, max, onBlur: onBlurProp, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [editingValue, setEditingValue] = React.useState<string | null>(null);
    const allowDecimals = step !== undefined && step < 1;

    const display =
      focused && editingValue !== null
        ? editingValue
        : formatWithCommas(value);

    React.useEffect(() => {
      if (!focused && editingValue === null && (value === 0 || value === undefined || value === null || Number.isNaN(value))) {
        setEditingValue(null);
      }
    }, [value, focused, editingValue]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      const raw = value === 0 || value === undefined || value === null || Number.isNaN(value) ? "" : String(value);
      setEditingValue(raw.replace(/,/g, ""));
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      const raw = editingValue ?? "";
      const num = parseAmount(raw);
      onChange(num);
      setEditingValue(null);
      onBlurProp?.();
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const sanitized = sanitizeNumericInput(raw, allowDecimals ?? false);
      setEditingValue(sanitized);
      const num = parseAmount(sanitized);
      onChange(num);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("min-h-[44px] touch-manipulation", className)}
        value={display}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
      />
    );
  }
);
AmountInput.displayName = "AmountInput";
