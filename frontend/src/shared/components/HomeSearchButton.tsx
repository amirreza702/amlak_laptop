"use client";

/**
 * ============================================================
 * HomeSearchButton
 * ============================================================
 *
 * این کامپوننت دکمه ورود به Feature جستجو است.
 *
 * نکته:
 * ------------------------------------------------------------
 * این فایل داخل shared قرار دارد، چون خودش منطق Search ندارد.
 *
 * فقط:
 *
 *     کلیک کاربر
 *          ↓
 *     router.push("/search")
 *
 * ============================================================
 */

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function HomeSearchButton() {

  /**
   * ----------------------------------------------------------
   * create listner nextjs
   * ----------------------------------------------------------
   */
  const router = useRouter();

  /**
   * ----------------------------------------------------------
   * click event to app/search/page.tsx
   * ----------------------------------------------------------
   */
  const handleSearch = () => {
    router.push("/search");
  };

  /**
   * ----------------------------------------------------------
   * UI
   * ----------------------------------------------------------
   */
  return (
    <button
      type="button"
      onClick={handleSearch}
      className="
        flex
        w-full
        items-center
        justify-center
        gap-3
        rounded-xl
        bg-slate-900
        px-5
        py-4
        text-base
        font-bold
        text-white
        shadow-sm
        transition-all
        duration-200
        hover:bg-slate-800
        hover:shadow-md
        active:scale-[0.99]
      "
    >
      <Search
        className="h-5 w-5"
        strokeWidth={2.2}
      />

      <span>
        جستجوی ملک
      </span>
    </button>
  );
}