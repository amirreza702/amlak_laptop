import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** ورودی پایه هشتی با فوکوس طلایی ملایم به‌عنوان تأکید برند. */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-10 w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900",
      "placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(6,42,91,0.02)] outline-none",
      "transition-[border-color,box-shadow,background-color] duration-150 focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/20",
      "disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
