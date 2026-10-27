"use client";

/**
 * ============================================================
 * SearchBar
 * ============================================================
 *
 * نوار جستجوی مکان در صفحه جستجوی ملک.
 *
 * قابلیت‌ها:
 *
 * 1. بازگشت
 * 2. ورود محله / خیابان / شهر / کدپستی
 * 3. اجرای جستجو با Enter
 * 4. اجرای جستجو با دکمه جستجو
 * 5. پاک کردن متن
 *
 * نکته:
 *
 * جستجوی واقعی مکان بعداً به API متصل خواهد شد.
 * در این مرحله فقط مقدار district را به فیلتر اعمال‌شده
 * منتقل می‌کنیم.
 * ============================================================
 */

import {
  ArrowRight,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

interface SearchBarProps {
  district: string;

  setDistrict: (value: string) => void;

  /**
   * اجرای جستجوی فعلی
   *
   * این تابع از usePropertySearch می‌آید
   * و district را روی appliedFilters اعمال می‌کند.
   */
  search: () => Promise<void>;

  /**
   * وضعیت اجرای جستجو
   */
  isSearching: boolean;
}

export function SearchBar({
  district,
  setDistrict,
  search,
  isSearching,
}: SearchBarProps) {
  const router = useRouter();

  /**
   * ----------------------------------------------------------
   * بازگشت
   * ----------------------------------------------------------
   */
  const handleBack = () => {
    router.back();
  };

  /**
   * ----------------------------------------------------------
   * پاک کردن
   * ----------------------------------------------------------
   */
  const handleClear = () => {
    setDistrict("");
  };

  /**
   * ----------------------------------------------------------
   * اجرای جستجو
   * ----------------------------------------------------------
   */
  const handleSearch = async () => {
    if (isSearching) {
      return;
    }

    await search();
  };

  /**
   * ----------------------------------------------------------
   * Enter
   * ----------------------------------------------------------
   */
  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    await handleSearch();
  };

  return (
    <div
      className="
        flex
        items-center
        gap-2
        rounded-2xl
        border
        border-white/80
        bg-white/95
        p-2
        shadow-2xl
        backdrop-blur-xl
      "
    >
      {/* =====================================================
          بازگشت
         ===================================================== */}
      <button
        type="button"
        onClick={handleBack}
        className="
          flex
          h-11
          w-11
          shrink-0
          items-center
          justify-center
          rounded-xl
          text-slate-600
          transition
          hover:bg-slate-100
          active:scale-95
        "
        aria-label="بازگشت"
      >
        <ArrowRight size={20} />
      </button>

      {/* =====================================================
          فرم جستجو

          فرم باعث می‌شود Enter نیز به‌صورت طبیعی
          رفتار submit داشته باشد.
         ===================================================== */}
      <form
        className="
          flex
          min-w-0
          flex-1
          items-center
          gap-2
        "
        onSubmit={async (event) => {
          event.preventDefault();
          await handleSearch();
        }}
      >
        {/* آیکون جستجو */}
        <button
          type="submit"
          disabled={isSearching}
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-slate-500
            transition
            hover:bg-slate-100
            hover:text-slate-700
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          aria-label="جستجو"
        >
          {isSearching ? (
            <Loader2
              size={20}
              className="animate-spin"
            />
          ) : (
            <Search size={20} />
          )}
        </button>

        {/* =================================================
            ورودی
           ================================================= */}
        <input
          type="search"
          value={district}
          onChange={(event) =>
            setDistrict(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="محله، خیابان، شهر یا کدپستی را جستجو کنید"
          autoComplete="off"
          className="
          
            search-location-input
            min-w-0
            flex-1
            appearance-none
            bg-transparent
            px-1
            text-sm
            font-medium
            text-slate-800
            outline-none
            ring-0
            focus:outline-none
            focus:ring-0
            placeholder:text-slate-400
            sm:text-base
  

          "
          aria-label="جستجوی محله، خیابان، شهر یا کدپستی"
        />

        {/* =================================================
            پاک کردن
           ================================================= */}
        {district.trim() !== "" && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isSearching}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-600
              active:scale-95
              disabled:opacity-50
            "
            aria-label="پاک کردن جستجو"
          >
            <X size={18} />
          </button>
        )}
      </form>
    </div>
  );
}