import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "default", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
        "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b89650] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
        size === "sm" && "min-h-9 px-3 text-xs",
        size === "md" && "min-h-10 px-4 py-2 text-sm",
        size === "lg" && "min-h-12 px-5 py-3 text-sm",
        variant === "default" && "bg-[#062a5b] text-white shadow-sm hover:bg-[#0b3b76] hover:shadow-md",
        variant === "outline" && "border border-[#cbd4df] bg-white/80 text-[#17385f] hover:border-[#b89650] hover:bg-[#f7f4ef]",
        variant === "secondary" && "border border-[#e6dfd1] bg-[#f7f4ef] text-[#062a5b] hover:bg-[#efe8dc]",
        variant === "ghost" && "text-[#41536a] hover:bg-[#edf1f6] hover:text-[#062a5b]",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className
      )}
      {...props}
    />
  );
}
