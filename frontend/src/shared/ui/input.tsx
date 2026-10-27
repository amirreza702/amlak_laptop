import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input
 *
 * ورودی عمومی فرم.
 *
 * نکته مهم:
 * نوع onChange از React.InputHTMLAttributes گرفته می‌شود.
 * بنابراین event در PropertyFields دیگر implicit any نخواهد بود.
 */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * کامپوننت Input
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
          "text-foreground shadow-sm",
          "placeholder:text-muted-foreground",
          "outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };