"use client";

import { Building2 } from "lucide-react";

/*
  ================================================================
  MockMap
  ================================================================

  این کامپوننت فقط برای Prototype / ظاهر اولیه سایت است.

  نکته مهم:
  - این نقشه واقعی نیست.
  - برای نمایش ظاهر صفحه Home استفاده می‌شود.
  - به MapPropertyMarker واقعی وابسته نیست.
  - Markerهای قیمت‌دار مخصوص همین Prototype هستند.
  - بنابراین تغییرات MapPropertyMarker.tsx روی این نقشه
    تأثیری ندارد.
  ================================================================
*/


/*
  ================================================================
  MockPriceMarker
  ================================================================

  Marker ساده مخصوص نقشه Prototype.

  ورودی‌ها:
  - price : قیمت نمایشی ملک
  - top   : موقعیت عمودی
  - left  : موقعیت افقی

  این کامپوننت عمداً داخل MockMap قرار گرفته تا
  با MapPropertyMarker واقعی قاطی نشود.
  ================================================================
*/

interface MockPriceMarkerProps {
  price: string;
  top: string;
  left: string;
}

function MockPriceMarker({
  price,
  top,
  left,
}: MockPriceMarkerProps) {
  return (
    <div
      className="
        absolute
        z-20
        -translate-x-1/2
        -translate-y-1/2
      "
      style={{
        top,
        left,
      }}
    >
      {/* بدنه مارکر قیمت */}
      <div
        className="
          whitespace-nowrap
          rounded-full
          border
          border-white
          bg-slate-900
          px-3
          py-1.5
          text-xs
          font-bold
          text-white
          shadow-lg
          transition-all
          duration-200
          hover:scale-105
          hover:bg-slate-800
        "
        dir="rtl"
      >
        {price}
      </div>

      {/* نوک کوچک مارکر */}
      <div
        className="
          absolute
          left-1/2
          top-full
          h-2
          w-2
          -translate-x-1/2
          -translate-y-1/2
          rotate-45
          bg-slate-900
        "
      />
    </div>
  );
}


/*
  ================================================================
  MockMap
  ================================================================
*/

export function MockMap() {
  return (
    <div
      className="
        relative
        h-full
        w-full
        overflow-hidden
        bg-[#e5ebe5]
      "
    >

      {/* =========================================================
          فضای سبز
          ========================================================= */}

      <div
        className="
          absolute
          left-[-10%]
          top-[12%]
          h-24
          w-[120%]
          rotate-[-6deg]
          bg-emerald-100/55
        "
      />


      {/* =========================================================
          خیابان افقی اول
          ========================================================= */}

      <div
        className="
          absolute
          left-[-10%]
          top-[35%]
          h-10
          w-[120%]
          rotate-6
          bg-white/65
        "
      />


      {/* =========================================================
          خیابان افقی دوم
          ========================================================= */}

      <div
        className="
          absolute
          left-[-10%]
          top-[68%]
          h-8
          w-[120%]
          rotate-[-3deg]
          bg-white/65
        "
      />


      {/* =========================================================
          خیابان عمودی اول
          ========================================================= */}

      <div
        className="
          absolute
          left-[30%]
          top-[-10%]
          h-[120%]
          w-10
          rotate-[-12deg]
          bg-white/65
        "
      />


      {/* =========================================================
          خیابان عمودی دوم
          ========================================================= */}

      <div
        className="
          absolute
          left-[70%]
          top-[-10%]
          h-[120%]
          w-8
          rotate-6
          bg-white/65
        "
      />


      {/* =========================================================
          محدوده مرکزی نمونه
          ========================================================= */}

      <div
        className="
          absolute
          left-[15%]
          top-[25%]
          h-[45%]
          w-[70%]
          rounded-[40%]
          border
          border-brand-turquoise/20
          bg-brand-turquoise/5
        "
      />


      {/* =========================================================
          نقطه مرکزی نمونه
          ========================================================= */}

      <div
        className="
          absolute
          left-1/2
          top-1/2
          -translate-x-1/2
          -translate-y-1/2
        "
      >

        {/* هاله اطراف نقطه مرکزی */}

        <div
          className="
            absolute
            -inset-8
            rounded-full
            border
            border-brand-turquoise/20
            bg-brand-turquoise/5
          "
        />

        {/* نقطه مرکزی */}

        <div
          className="
            relative
            flex
            h-5
            w-5
            items-center
            justify-center
            rounded-full
            border-4
            border-white
            bg-brand-turquoise
            shadow-lg
          "
        >
          <div
            className="
              h-2
              w-2
              rounded-full
              bg-white
            "
          />
        </div>

      </div>


      {/* =========================================================
          Markerهای نمونه ملک
          
          این ۵ مورد عمداً حفظ شده‌اند.
          ========================================================= */}

      <MockPriceMarker
        price="8.2 میلیارد"
        top="31%"
        left="22%"
      />

      <MockPriceMarker
        price="12 میلیارد"
        top="24%"
        left="68%"
      />

      <MockPriceMarker
        price="۶.۵ میلیارد"
        top="58%"
        left="34%"
      />

      <MockPriceMarker
        price="۹٫۸ میلیارد"
        top="63%"
        left="73%"
      />

      <MockPriceMarker
        price="۴٫۹ میلیارد"
        top="43%"
        left="52%"
      />


      {/* =========================================================
          ساختمان‌های نمونه
          ========================================================= */}

      <div
        className="
          absolute
          left-[12%]
          top-[50%]
          text-slate-400/30
        "
      >
        <Building2 className="h-10 w-10" />
      </div>


      <div
        className="
          absolute
          right-[12%]
          top-[40%]
          text-slate-400/30
        "
      >
        <Building2 className="h-12 w-12" />
      </div>


      <div
        className="
          absolute
          left-[45%]
          top-[78%]
          text-slate-400/25
        "
      >
        <Building2 className="h-9 w-9" />
      </div>

    </div>
  );
}