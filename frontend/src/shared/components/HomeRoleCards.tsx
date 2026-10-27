"use client";

import { Building2, UserCheck } from "lucide-react";

interface HomeRoleCardsProps {
  onAgentClick: () => void;
  onOwnerClick: () => void;
}

export function HomeRoleCards({
  onAgentClick,
  onOwnerClick,
}: HomeRoleCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-1">
      {/* کارت مشاور */}
      <button
        type="button"
        onClick={onAgentClick}
        className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-white/80 bg-white/70 p-3.5 text-right shadow-sm backdrop-blur-md transition-all duration-200 active:scale-[0.97] hover:border-[#4F9CF9]/40 hover:bg-white"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#043873]/10 text-[#043873] transition-colors group-hover:bg-[#043873] group-hover:text-white">
          <UserCheck className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-xs font-bold text-[#043873]">مشاور املاک</span>
          <span className="mt-0.5 block text-[10px] text-slate-500">پنل اختصاصی فایلینگ</span>
        </div>
      </button>

      {/* کارت مالک */}
      <button
        type="button"
        onClick={onOwnerClick}
        className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-white/80 bg-white/70 p-3.5 text-right shadow-sm backdrop-blur-md transition-all duration-200 active:scale-[0.97] hover:border-[#FFE492] hover:bg-white"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 transition-colors group-hover:bg-amber-500 group-hover:text-white">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-xs font-bold text-[#043873]">مالک</span>
          <span className="mt-0.5 block text-[10px] text-slate-500">ثبت مستقیم آگهی</span>
        </div>
      </button>
    </div>
  );
}
