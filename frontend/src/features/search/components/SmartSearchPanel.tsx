"use client";

/**
 * ============================================================
 * SmartSearchPanel
 * ------------------------------------------------------------
 * جستجوی هوشمند با زبان طبیعی
 *
 * کاربر به جای انتخاب تک‌تک فیلترها، خواسته خود را می‌نویسد.
 *
 * مثال:
 * «آپارتمان دو خوابه نزدیک میدان امام خمینی،
 * تا ۵ میلیارد، نورگیر و مناسب خانواده»
 *
 * بعداً همین متن را به Backend / AI می‌فرستیم
 * تا به فیلترهای قابل جستجو تبدیل شود.
 * ============================================================
 */

import { Search, Sparkles, X } from "lucide-react";
import { useState } from "react";

interface SmartSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  search: () => Promise<void>;
  isSearching: boolean;
}

const suggestions = [
  "نزدیک میدان امام خمینی",
  "مناسب خانواده",
  "نورگیر",
  "قیمت مناسب",
];

export function SmartSearchPanel({
  isOpen,
  onClose,
  search,
  isSearching,
}: SmartSearchPanelProps) {
  /**
   * متن جستجوی هوشمند
   */
  const [description, setDescription] = useState("");

  /**
   * افزودن پیشنهاد به متن
   */
  const addSuggestion = (text: string) => {
    setDescription((current) => {
      if (!current.trim()) {
        return text;
      }

      return `${current}، ${text}`;
    });
  };

  /**
   * اجرای جستجو
   */
  const handleSearch = async () => {
    /**
     * فعلاً search همان Hook فعلی است.
     *
     * در مرحله Backend:
     * description نیز به API ارسال خواهد شد.
     */
    await search();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="
        mt-2
        overflow-hidden
        rounded-2xl
        border
        border-white/80
        bg-white/95
        shadow-2xl
        backdrop-blur-2xl
      "
    >
      {/* =====================================================
          Header
          ===================================================== */}
      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-slate-100
          px-4
          py-3
        "
      >
        <div className="flex items-center gap-2">
          <div
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              bg-slate-900
              text-white
            "
          >
            <Sparkles size={16} />
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900">
              جستجوی هوشمند
            </div>

            <div className="text-[11px] text-slate-500">
              خواسته‌ات را به زبان طبیعی توضیح بده
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            text-slate-400
            hover:bg-slate-100
          "
          aria-label="بستن"
        >
          <X size={17} />
        </button>
      </div>

      <div className="p-4">

        {/* ===================================================
            متن طبیعی کاربر
            =================================================== */}
        <textarea
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          rows={3}
          placeholder="
مثلاً: آپارتمان دو خوابه نزدیک میدان امام خمینی، تا ۵ میلیارد، نورگیر و مناسب خانواده
          "
          className="
            w-full
            resize-none
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            px-4
            py-3
            text-sm
            leading-7
            text-slate-800
            outline-none
            transition
            focus:border-slate-400
            focus:bg-white
          "
        />

        {/* ===================================================
            پیشنهادهای آماده
            =================================================== */}
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => addSuggestion(item)}
              className="
                rounded-full
                border
                border-slate-200
                bg-white
                px-3
                py-1.5
                text-xs
                text-slate-600
                transition
                hover:bg-slate-50
              "
            >
              {item}
            </button>
          ))}
        </div>

        {/* ===================================================
            جستجو
            =================================================== */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="
            mt-4
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-slate-900
            px-4
            py-3
            text-sm
            font-bold
            text-white
            shadow-lg
            transition
            hover:bg-slate-800
            disabled:cursor-wait
            disabled:opacity-60
          "
        >
          {isSearching ? (
            "در حال جستجو..."
          ) : (
            <>
              <Search size={17} />
              جستجو در املاک
            </>
          )}
        </button>
      </div>
    </div>
  );
}