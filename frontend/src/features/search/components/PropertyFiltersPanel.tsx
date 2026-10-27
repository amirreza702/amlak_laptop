"use client";

/**
 * =========================================================
 * PropertyFiltersPanel
 * =========================================================
 *
 * پنل فیلترهای پیشرفته جستجوی ملک
 *
 * نکته معماری:
 *
 * این کامپوننت فقط مسئول UI است.
 *
 * State و منطق اصلی جستجو در:
 *
 * usePropertySearch
 *
 * قرار دارد.
 *
 * بنابراین این فایل:
 *
 * - مقدار فیلترها را نمایش می‌دهد
 * - تغییر فیلتر را به Hook ارسال می‌کند
 * - عملیات Reset را اجرا می‌کند
 * - عملیات Search را اجرا می‌کند
 *
 * =========================================================
 */

import { X } from "lucide-react";

import type {
  PropertySearchState,
} from "../hooks/usePropertySearch";

/**
 * =========================================================
 * Props
 * =========================================================
 */

interface PropertyFiltersPanelProps {
  /**
   * آیا پنل نمایش داده شود؟
   */
  isOpen: boolean;

  /**
   * بستن پنل
   */
  onClose: () => void;

  /**
   * State فعلی فیلترها
   */
  filters: PropertySearchState;

  /**
   * تغییر یک فیلتر
   */
  setFilter: <K extends keyof PropertySearchState>(
    key: K,
    value: PropertySearchState[K]
  ) => void;

  /**
   * بازگرداندن فیلترها به مقدار اولیه
   */
  resetFilters: () => void;

  /**
   * تعداد فیلترهای فعال
   */
  getActiveFilterCount: () => number;

  /**
   * اجرای جستجو
   */
  search: () => Promise<void>;

  /**
   * آیا جستجو در حال اجراست؟
   */
  isSearching: boolean;
}

/**
 * =========================================================
 * گزینه‌های تعداد اتاق
 * =========================================================
 */

const roomOptions = [
  { value: "1", label: "۱ اتاق" },
  { value: "2", label: "۲ اتاق" },
  { value: "3", label: "۳ اتاق" },
  { value: "4", label: "۴ اتاق" },
  { value: "5+", label: "۵ اتاق و بیشتر" },
];

/**
 * =========================================================
 * گزینه‌های تعداد حمام
 * =========================================================
 */

const bathroomOptions = [
  { value: "1", label: "۱ حمام" },
  { value: "2", label: "۲ حمام" },
  { value: "3+", label: "۳ حمام و بیشتر" },
];

/**
 * =========================================================
 * گزینه‌های سن بنا
 * =========================================================
 *
 * مقدار value برای نگهداری در State استفاده می‌شود.
 *
 * مثال:
 *
 * 0       → نوساز
 * 1-5     → یک تا پنج سال
 * 6-10    → شش تا ده سال
 * 11-20   → یازده تا بیست سال
 * 20+     → بیشتر از بیست سال
 *
 * =========================================================
 */

const ageOptions = [
  { value: "", label: "مهم نیست" },
  { value: "0", label: "نوساز" },
  { value: "1-5", label: "۱ تا ۵ سال" },
  { value: "6-10", label: "۶ تا ۱۰ سال" },
  { value: "11-20", label: "۱۱ تا ۲۰ سال" },
  { value: "20+", label: "بیش از ۲۰ سال" },
];

/**
 * =========================================================
 * گزینه‌های تازگی آگهی
 * =========================================================
 */

const updateOptions = [
  { value: "", label: "مهم نیست" },
  { value: "1", label: "امروز" },
  { value: "3", label: "۳ روز اخیر" },
  { value: "7", label: "۷ روز اخیر" },
  { value: "30", label: "۳۰ روز اخیر" },
];

/**
 * =========================================================
 * PropertyFiltersPanel
 * =========================================================
 */

export function PropertyFiltersPanel({
  isOpen,
  onClose,
  filters,
  setFilter,
  resetFilters,
  getActiveFilterCount,
  search,
  isSearching,
}: PropertyFiltersPanelProps) {
  /**
   * اگر پنل بسته است، هیچ چیزی نمایش نده.
   */
  if (!isOpen) {
    return null;
  }

  /**
   * =======================================================
   * کلاس مشترک Input
   * =======================================================
   */

  const inputClassName = `
    h-11
    w-full
    rounded-lg
    border
    border-slate-200
    bg-white
    px-3
    text-sm
    text-slate-800
    outline-none
    transition
    placeholder:text-slate-400
    focus:border-slate-400
    focus:ring-2
    focus:ring-slate-200
  `;

  /**
   * =======================================================
   * کلاس مشترک Select
   * =======================================================
   */

  const selectClassName = `
    h-11
    w-full
    rounded-lg
    border
    border-slate-200
    bg-white
    px-3
    text-sm
    text-slate-800
    outline-none
    transition
    focus:border-slate-400
    focus:ring-2
    focus:ring-slate-200
  `;

  /**
   * =======================================================
   * Checkbox
   * =======================================================
   *
   * برای فیلترهای Boolean استفاده می‌شود.
   */

  const Checkbox = ({
    checked,
    label,
    onChange,
  }: {
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
  }) => {
    return (
      <label
        className="
          flex
          cursor-pointer
          items-center
          gap-3
          rounded-lg
          border
          border-slate-200
          bg-white
          px-3
          py-3
          text-sm
          transition
          hover:border-slate-300
          hover:bg-slate-50
        "
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked)
          }
          className="
            h-4
            w-4
            accent-slate-900
          "
        />

        <span className="text-slate-700">
          {label}
        </span>
      </label>
    );
  };

  /**
   * =======================================================
   * اجرای جستجو
   * =======================================================
   */

  const handleSearch = async () => {
    await search();
    onClose();
  };

  /**
   * =======================================================
   * خروجی
   * =======================================================
   */

  return (
    <div
      className="
        mt-3
        max-h-[calc(100dvh-150px)]
        overflow-y-auto
        rounded-xl
        border
        border-white/70
        bg-white/95
        p-4
        shadow-2xl
        backdrop-blur-xl
        sm:p-5
      "
    >
      {/* ===================================================
          Header
         =================================================== */}

      <div
        className="
          mb-5
          flex
          items-center
          justify-between
          border-b
          border-slate-100
          pb-4
        "
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">
            فیلترهای جستجو
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {getActiveFilterCount() === 0
              ? "هنوز فیلتری انتخاب نشده"
              : `${getActiveFilterCount()} فیلتر فعال`}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="بستن فیلترها"
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-lg
            bg-slate-100
            text-slate-600
            transition
            hover:bg-slate-200
          "
        >
          <X size={18} />
        </button>
      </div>

      {/* ===================================================
          نوع معامله و ملک
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          نوع معامله و ملک
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={filters.transactionType}
            onChange={(event) =>
              setFilter(
                "transactionType",
                event.target.value as PropertySearchState["transactionType"]
              )
            }
            className={selectClassName}
          >
            <option value="">نوع معامله</option>
            <option value="خرید">خرید</option>
            <option value="رهن">رهن</option>
            <option value="اجاره">اجاره</option>
            <option value="رهن و اجاره">
              رهن و اجاره
            </option>
          </select>

          <select
            value={filters.propertyType}
            onChange={(event) =>
              setFilter(
                "propertyType",
                event.target.value as PropertySearchState["propertyType"]
              )
            }
            className={selectClassName}
          >
            <option value="">نوع ملک</option>
            <option value="آپارتمان">آپارتمان</option>
            <option value="خانه">خانه</option>
            <option value="ویلا">ویلا</option>
            <option value="زمین">زمین</option>
            <option value="مغازه">مغازه</option>
            <option value="اداری">اداری</option>
            <option value="باغ">باغ</option>
          </select>
        </div>
      </section>

      {/* ===================================================
          موقعیت
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          موقعیت
        </h3>

        <input
          type="text"
          value={filters.city}
          onChange={(event) =>
            setFilter("city", event.target.value)
          }
          placeholder="شهر"
          className={inputClassName}
        />

        <input
          type="text"
          value={filters.district}
          onChange={(event) =>
            setFilter("district", event.target.value)
          }
          placeholder="محله یا منطقه"
          className={`${inputClassName} mt-3`}
        />
      </section>

      {/* ===================================================
          قیمت
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          محدوده قیمت
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={filters.minPrice}
            onChange={(event) =>
              setFilter(
                "minPrice",
                event.target.value
              )
            }
            placeholder="حداقل قیمت"
            className={inputClassName}
          />

          <input
            type="text"
            inputMode="numeric"
            value={filters.maxPrice}
            onChange={(event) =>
              setFilter(
                "maxPrice",
                event.target.value
              )
            }
            placeholder="حداکثر قیمت"
            className={inputClassName}
          />
        </div>

        <p className="mt-2 text-xs text-slate-400">
          مبلغ را به واحد مناسب ملک وارد کنید.
        </p>
      </section>

      {/* ===================================================
          متراژ
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          متراژ
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={filters.minArea}
            onChange={(event) =>
              setFilter(
                "minArea",
                event.target.value
              )
            }
            placeholder="حداقل متراژ"
            className={inputClassName}
          />

          <input
            type="text"
            inputMode="numeric"
            value={filters.maxArea}
            onChange={(event) =>
              setFilter(
                "maxArea",
                event.target.value
              )
            }
            placeholder="حداکثر متراژ"
            className={inputClassName}
          />
        </div>

        <p className="mt-2 text-xs text-slate-400">
          واحد: مترمربع
        </p>
      </section>

      {/* ===================================================
          مشخصات ملک
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          مشخصات ملک
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={filters.rooms}
            onChange={(event) =>
              setFilter(
                "rooms",
                event.target.value
              )
            }
            className={selectClassName}
          >
            <option value="">
              تعداد اتاق
            </option>

            {roomOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.bathrooms}
            onChange={(event) =>
              setFilter(
                "bathrooms",
                event.target.value
              )
            }
            className={selectClassName}
          >
            <option value="">
              تعداد حمام
            </option>

            {bathroomOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ===================================================
          سن بنا
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          سن بنا
        </h3>

        <select
          value={
            filters.minYearBuilt === "20" &&
            filters.maxYearBuilt === ""
              ? "20+"
              : filters.minYearBuilt &&
                  filters.maxYearBuilt
                ? `${filters.minYearBuilt}-${filters.maxYearBuilt}`
                : filters.minYearBuilt === "0" &&
                    filters.maxYearBuilt === "0"
                  ? "0"
                  : ""
          }
          onChange={(event) => {
            const value = event.target.value;

            /**
             * بدون محدودیت
             */
            if (value === "") {
              setFilter("minYearBuilt", "");
              setFilter("maxYearBuilt", "");
              return;
            }

            /**
             * نوساز
             */
            if (value === "0") {
              setFilter("minYearBuilt", "0");
              setFilter("maxYearBuilt", "0");
              return;
            }

            /**
             * بازه سنی
             */
            if (value.includes("-")) {
              const [min, max] =
                value.split("-");

              setFilter(
                "minYearBuilt",
                min
              );

              setFilter(
                "maxYearBuilt",
                max
              );

              return;
            }

            /**
             * بیشتر از ۲۰ سال
             */
            if (value === "20+") {
              setFilter(
                "minYearBuilt",
                "20"
              );

              setFilter(
                "maxYearBuilt",
                ""
              );
            }
          }}
          className={selectClassName}
        >
          {ageOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </section>

      {/* ===================================================
          طبقه
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          طبقه
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            min="0"
            value={filters.minFloor}
            onChange={(event) =>
              setFilter(
                "minFloor",
                event.target.value
              )
            }
            placeholder="از طبقه"
            className={inputClassName}
          />

          <input
            type="number"
            min="0"
            value={filters.maxFloor}
            onChange={(event) =>
              setFilter(
                "maxFloor",
                event.target.value
              )
            }
            placeholder="تا طبقه"
            className={inputClassName}
          />
        </div>
      </section>

      {/* ===================================================
          امکانات
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          امکانات
        </h3>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Checkbox
            checked={filters.hasParking}
            label="پارکینگ"
            onChange={(value) =>
              setFilter(
                "hasParking",
                value
              )
            }
          />

          <Checkbox
            checked={filters.hasElevator}
            label="آسانسور"
            onChange={(value) =>
              setFilter(
                "hasElevator",
                value
              )
            }
          />

          <Checkbox
            checked={filters.hasStorage}
            label="انباری"
            onChange={(value) =>
              setFilter(
                "hasStorage",
                value
              )
            }
          />

          <Checkbox
            checked={filters.hasBalcony}
            label="بالکن"
            onChange={(value) =>
              setFilter(
                "hasBalcony",
                value
              )
            }
          />

          <Checkbox
            checked={filters.hasYard}
            label="حیاط"
            onChange={(value) =>
              setFilter(
                "hasYard",
                value
              )
            }
          />

          <Checkbox
            checked={filters.hasPool}
            label="استخر"
            onChange={(value) =>
              setFilter(
                "hasPool",
                value
              )
            }
          />
        </div>
      </section>

      {/* ===================================================
          اعتبار و وضعیت حقوقی
         =================================================== */}

      <section className="mb-6">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-800">
            اعتبار و وضعیت حقوقی
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            اطلاعاتی که توسط هشتی بررسی و تأیید شده‌اند.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Checkbox
            checked={filters.singlePageDeed}
            label="سند تک‌برگ"
            onChange={(value) =>
              setFilter(
                "singlePageDeed",
                value
              )
            }
          />

          <Checkbox
            checked={filters.documentsVerified}
            label="مدارک تأیید شده"
            onChange={(value) =>
              setFilter(
                "documentsVerified",
                value
              )
            }
          />

          <Checkbox
            checked={filters.transactionAllowed}
            label="قابل معامله"
            onChange={(value) =>
              setFilter(
                "transactionAllowed",
                value
              )
            }
          />

          <Checkbox
            checked={filters.ownerVerified}
            label="مالک احراز هویت شده"
            onChange={(value) =>
              setFilter(
                "ownerVerified",
                value
              )
            }
          />

          <Checkbox
            checked={
              filters.propertyInfoVerified
            }
            label="اطلاعات ملک تأیید شده"
            onChange={(value) =>
              setFilter(
                "propertyInfoVerified",
                value
              )
            }
          />

          <Checkbox
            checked={
              filters.locationVerified
            }
            label="موقعیت ملک تأیید شده"
            onChange={(value) =>
              setFilter(
                "locationVerified",
                value
              )
            }
          />
        </div>
      </section>

      {/* ===================================================
          تازگی آگهی
         =================================================== */}

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          تازگی آگهی
        </h3>

        <select
          value={filters.updatedWithinDays}
          onChange={(event) =>
            setFilter(
              "updatedWithinDays",
              event.target.value
            )
          }
          className={selectClassName}
        >
          {updateOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </section>

      {/* ===================================================
          فقط آگهی‌های فعال
         =================================================== */}

      <section className="mb-5">
        <Checkbox
          checked={filters.onlyActive}
          label="فقط آگهی‌های فعال"
          onChange={(value) =>
            setFilter(
              "onlyActive",
              value
            )
          }
        />
      </section>

      {/* ===================================================
          دکمه‌های پایین پنل
         =================================================== */}

      <div
        className="
          sticky
          bottom-0
          flex
          gap-2
          border-t
          border-slate-100
          bg-white/95
          pt-4
          backdrop-blur
        "
      >
        {/* -----------------------------------------------
            پاک کردن
           ----------------------------------------------- */}

        <button
          type="button"
          onClick={resetFilters}
          className="
            h-12
            rounded-lg
            border
            border-slate-200
            px-4
            text-sm
            font-semibold
            text-slate-700
            transition
            hover:bg-slate-50
          "
        >
          پاک کردن
        </button>

        {/* -----------------------------------------------
            نمایش نتایج
           ----------------------------------------------- */}

        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="
            flex
            h-12
            flex-1
            items-center
            justify-center
            rounded-lg
            bg-slate-900
            px-4
            text-sm
            font-bold
            text-white
            transition
            hover:bg-slate-800
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {isSearching
            ? "در حال جستجو..."
            : `نمایش نتایج${
                getActiveFilterCount() > 0
                  ? ` (${getActiveFilterCount()})`
                  : ""
              }`}
        </button>
      </div>
    </div>
  );
}