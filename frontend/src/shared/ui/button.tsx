import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

/** دکمه پایه هشتی با رنگ‌ها و حالت‌های تعاملی هماهنگ با سیستم طراحی. */
export function Button({ className, variant = "default", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "min-h-9 px-3 text-xs",
        size === "md" && "min-h-10 px-4 py-2 text-sm",
        size === "lg" && "min-h-11 px-5 py-2.5 text-sm",
        variant === "default" && "bg-brand-navy text-white shadow-sm hover:bg-brand-navy/90",
        variant === "outline" && "border border-slate-300 bg-white/90 text-brand-navy hover:border-slate-400 hover:bg-slate-50",
        variant === "secondary" && "border border-slate-200 bg-slate-100 text-brand-navy hover:border-slate-300 hover:bg-slate-200/70",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-brand-navy",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className
      )}
      {...props}
    />
  );
}
