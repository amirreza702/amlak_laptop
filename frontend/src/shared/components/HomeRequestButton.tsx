"use client";

import { FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function HomeRequestButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/request")}
      className="group flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-3.5 text-[#043873] shadow-sm backdrop-blur-sm transition-all duration-200 active:scale-[0.98] hover:border-[#4F9CF9]/40 hover:bg-white"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#043873]">
          <FileText className="h-4 w-4" />
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">سپردن / درخواست ملک</p>
          <p className="text-[11px] text-slate-400">بهترین ملک‌ها را برای شما پیدا می‌کنیم</p>
        </div>
      </div>
      <ArrowLeft className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:-translate-x-1 group-hover:text-[#043873]" />
    </button>
  );
}
