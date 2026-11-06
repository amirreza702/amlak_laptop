import * as React from "react";
import { cn } from "@/lib/utils";

/** سطوح مشترک شیشه‌ای با مرز خنثی و سایه کم‌عمق. */
function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[13px] border border-[#e5eaf0] bg-white/85 text-slate-900 shadow-[0_7px_24px_rgba(23,45,76,.04)] backdrop-blur-md", className)} {...props} />;
}
function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 border-b border-[#edf0f4] p-5", className)} {...props} />;
}
function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-extrabold leading-7 tracking-tight text-[#14263d]", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-[#718096]", className)} {...props} />;
}
function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 border-t border-[#edf0f4] p-5", className)} {...props} />;
}
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
