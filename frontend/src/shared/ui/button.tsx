import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Button
 *
 * کامپوننت ساده و قابل استفاده مجدد برای دکمه‌ها.
 *
 * فعلاً فقط API موردنیاز Property را پوشش می‌دهیم
 * و بعداً می‌توانیم variantهای بیشتری به آن اضافه کنیم.
 */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * نوع ظاهری دکمه
   *
   * فعلاً:
   * - default: دکمه اصلی
   * - outline: دکمه با حاشیه
   */
  variant?: "default" | "outline";
}

/**
 * کامپوننت Button
 */
export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        // استایل پایه
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",

        // استایل نوع دکمه
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",

        variant === "outline" &&
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",

        className
      )}
      {...props}
    />
  );
}