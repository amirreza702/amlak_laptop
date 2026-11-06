import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** ورودی مشترک هشتی با فوکوس طلایی ملایم و زمینه شفاف. */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-10 w-full rounded-lg border border-[#dce2e9] bg-white/90 px-3 py-2 text-sm text-[#14263d]",
      "placeholder:text-[#8a96a6] shadow-[inset_0_1px_2px_rgba(6,42,91,.02)] outline-none",
      "transition-[border-color,box-shadow,background] duration-150 focus-visible:border-[#b89650] focus-visible:ring-2 focus-visible:ring-[#b89650]/15",
      "disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
export { Input };
