"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Number input that:
 * - Shows empty (not "0") when value is 0, so backspace can clear
 * - Allows typing and clearing naturally for low-literacy users
 * - Uses inputMode="decimal" for numeric keyboard without spin buttons
 * - Optional placeholder (e.g. "0") as hint only
 */
export interface NumberInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
  /** Step for decimals (e.g. 0.01). Omit for integers. */
  step?: number;
  /** Placeholder when empty (e.g. "0" or "Enter amount"). Shown as hint, not value. */
  placeholder?: string;
  min?: number;
  max?: number;
  onBlur?: () => void;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, step, placeholder = "0", className, min, max, onBlur: onBlurProp, ...props }, ref) => {
    const [display, setDisplay] = React.useState<string>(() =>
      value === 0 || value === undefined || value === null || Number.isNaN(value) ? "" : String(value)
    );

    // Sync from form when value changes from outside (e.g. form reset)
    React.useEffect(() => {
      if (value === 0 || value === undefined || value === null || Number.isNaN(value)) {
        setDisplay("");
      } else {
        setDisplay(String(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplay(raw);
      if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
        onChange(0);
        return;
      }
      const num = parseFloat(raw);
      if (!Number.isNaN(num)) {
        onChange(num);
      }
    };

    const handleBlur = () => {
      // On blur, normalize: if display is empty or invalid, keep 0 and show empty
      const trimmed = display.trim();
      if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
        onChange(0);
        setDisplay("");
      } else {
        const num = parseFloat(trimmed);
        if (Number.isNaN(num)) {
          onChange(0);
          setDisplay("");
        } else {
          onChange(num);
          setDisplay(String(num));
        }
      }
      onBlurProp?.();
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
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";
