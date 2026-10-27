
"use client";

/**
 * =========================================================
 * PropertyPreviewCard
 * =========================================================
 *
 * کارت خلاصه ملک که بعد از انتخاب Marker روی نقشه نمایش داده
 * می‌شود.
 *
 * اطلاعات ملک از Search API دریافت شده و از طریق MapProperty
 * به این کامپوننت می‌رسد.
 * =========================================================
 */

import { useRouter } from "next/navigation";
import type { MapProperty } from "@/shared/components/map/RealMap";

/**
 * ---------------------------------------------------------
 * Props
 * ---------------------------------------------------------
 */

interface PropertyPreviewCardProps {
  property: MapProperty;

  /**
   * بستن کارت
   */
  onClose: () => void;
}

/**
 * =========================================================
 * Component
 * =========================================================
 */

export function PropertyPreviewCard({
  property,
  onClose,
}: PropertyPreviewCardProps) {
  const router = useRouter();

  /**
   * -------------------------------------------------------
   * مشاهده جزئیات ملک
   * -------------------------------------------------------
   *
   * شناسه واقعی ملک از Backend در property.id قرار دارد.
   *
   * مثال:
   * /property/test-map-001
   */
  const handleViewDetails = () => {
    router.push(`/property/${property.id}`);
  };

  return (
    <div
      dir="rtl"
      className="
        absolute
        bottom-5
        right-4
        z-30
        w-[calc(100%-2rem)]
        max-w-sm
        overflow-hidden
        rounded-2xl
        bg-white
        shadow-2xl
        ring-1
        ring-slate-200/80
      "
    >
      {/* ---------------------------------------------------
          Header
      --------------------------------------------------- */}

      <div
        className="
          flex
          items-start
          justify-between
          gap-3
          border-b
          border-slate-100
          px-4
          py-3
        "
      >
        <div>
          <h3
            className="
              text-base
              font-bold
              text-slate-900
            "
          >
            {property.title}
          </h3>

          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            {property.location}
          </p>
        </div>

        {/* -------------------------------------------------
            Close
        ------------------------------------------------- */}

        <button
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-full
            text-lg
            text-slate-500
            transition
            hover:bg-slate-100
            hover:text-slate-900
          "
        >
          ×
        </button>
      </div>

      {/* ---------------------------------------------------
          Property Information
      --------------------------------------------------- */}

      <div className="space-y-4 px-4 py-4">
        {/* مشخصات اصلی */}

        <div
          className="
            grid
            grid-cols-3
            gap-2
          "
        >
          <div
            className="
              rounded-xl
              bg-slate-50
              px-2
              py-3
              text-center
            "
          >
            <div className="text-sm font-bold text-slate-900">
              {property.area}
            </div>

            <div className="mt-1 text-[11px] text-slate-500">
              مترمربع
            </div>
          </div>

          <div
            className="
              rounded-xl
              bg-slate-50
              px-2
              py-3
              text-center
            "
          >
            <div className="text-sm font-bold text-slate-900">
              {property.rooms}
            </div>

            <div className="mt-1 text-[11px] text-slate-500">
              خواب
            </div>
          </div>

          <div
            className="
              rounded-xl
              bg-slate-50
              px-2
              py-3
              text-center
            "
          >
            <div className="text-sm font-bold text-slate-900">
              فعال
            </div>

            <div className="mt-1 text-[11px] text-slate-500">
              وضعیت
            </div>
          </div>
        </div>

        {/* قیمت */}

        <div>
          <div className="text-xs text-slate-500">
            قیمت
          </div>

          <div
            className="
              mt-1
              text-lg
              font-extrabold
              text-slate-900
            "
          >
            {property.price}
          </div>
        </div>

        {/* -------------------------------------------------
            مشاهده جزئیات
        ------------------------------------------------- */}

        <button
          type="button"
          onClick={handleViewDetails}
          className="
            w-full
            rounded-xl
            bg-slate-900
            px-4
            py-3
            text-sm
            font-bold
            text-white
            transition
            hover:bg-slate-800
            active:scale-[0.99]
          "
        >
          مشاهده جزئیات ملک
        </button>
      </div>
    </div>
  );
}
