"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomerFavoriteButton } from "@/features/customer/components/CustomerFavoriteButton";

/**
 * ============================================================
 * انواع داده‌های قابل نمایش در صفحه جزئیات ملک
 * ============================================================
 *
 * این صفحه اطلاعات ملک را فقط در مرورگر دریافت می‌کند.
 * Endpoint عمومی بک‌اند، اطلاعات حساس مکانی را برنمی‌گرداند.
 */
interface PropertyListing {
  id: string;
  propertyId: string;
  transactionType: string;
  salePrice?: string | null;
  depositAmount?: string | null;
  rentAmount?: string | null;
  status: string;
  publishedAt?: string | null;
  rejectedAt?: string | null;
  expiredAt?: string | null;
}

/**
 * ============================================================
 * نوع اطلاعات ملک
 * ============================================================
 *
 * ساختار پاسخ:
 *
 * GET /properties/:id
 *
 * شامل:
 *
 * Property
 * +
 * listing
 * ============================================================
 */
interface Property {
  id: string;
  propertyType: string;
  registrationSource?: string;
  city: string;
  district: string;
  address?: string | null;
  postalCode?: string | null;
  area?: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  floor?: number | null;
  description?: string | null;
  latitudePublic?: number | null;
  longitudePublic?: number | null;
  isActive: boolean;

  /**
   * Listing فعلی ملک
   *
   * قیمت فعلی در این بخش قرار دارد.
   */
  listing?: PropertyListing | null;
}



/**
 * آدرس API در حالت استاتیک هم‌مبدأ است؛ در حالت توسعه می‌توان
 * NEXT_PUBLIC_API_URL را به آدرس قابل دسترس Backend تنظیم کرد.
 */
function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

/**
 * ============================================================
 * تبدیل نوع ملک به فارسی
 * ============================================================
 */
function getPropertyTypeLabel(
  propertyType: string
): string {
  const labels: Record<string, string> = {
    APARTMENT: "آپارتمان",
    HOUSE: "خانه",
    VILLA: "ویلا",
    LAND: "زمین",
    SHOP: "مغازه",
    OFFICE: "اداری",
    GARDEN: "باغ",
  };

  return labels[propertyType] || propertyType;
}

/**
 * ============================================================
 * نمایش قیمت
 * ============================================================
 *
 * قیمت بر اساس نوع معامله از PropertyListing خوانده می‌شود.
 *
 * SALE
 *   ↓
 * salePrice
 *
 * FULL_DEPOSIT
 *   ↓
 * depositAmount
 *
 * RENT
 *   ↓
 * rentAmount
 *
 * نکته:
 * مقدار Decimal از Backend به صورت string دریافت می‌شود.
 */
function getPriceLabel(
  listing?: PropertyListing | null
): string {
  if (!listing) {
    return "قیمت ثبت نشده است";
  }

  /**
   * فروش
   */
  if (
    listing.transactionType === "SALE" &&
    listing.salePrice
  ) {
    return `${Number(listing.salePrice).toLocaleString(
      "fa-IR"
    )} تومان`;
  }

  /**
   * رهن کامل
   */
  if (
    listing.transactionType === "FULL_DEPOSIT" &&
    listing.depositAmount
  ) {
    return `${Number(
      listing.depositAmount
    ).toLocaleString("fa-IR")} تومان`;
  }

  /**
   * اجاره
   */
  if (
    listing.transactionType === "RENT" &&
    listing.rentAmount
  ) {
    return `${Number(
      listing.rentAmount
    ).toLocaleString("fa-IR")} تومان`;
  }

  return "قیمت ثبت نشده است";
}



type LoadState = "loading" | "loaded" | "not-found" | "error";

export default function PropertyDetailClient() {
  const [property, setProperty] = useState<Property | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  /**
   * شناسه از URL فعلی خوانده می‌شود، نه از Build.
   * در خروجی استاتیک، Nginx آدرس‌های جدید را به فایل fallback می‌فرستد؛
   * ولی URL اصلی مرورگر همچنان /property/:id باقی می‌ماند.
   */
  useEffect(() => {
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    let id = lastSegment || "";

    try {
      id = decodeURIComponent(id);
    } catch {
      // اگر قسمت URL کدگذاری نامعتبر داشته باشد، همان مقدار رد می‌شود.
    }

    if (!id || id === "__csr__") {
      setLoadState("not-found");
      return;
    }

    const controller = new AbortController();

    async function loadProperty() {
      try {
        const response = await fetch(
          `${getPublicApiUrl()}/properties/${encodeURIComponent(id)}/public`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 404) {
          setProperty(null);
          setLoadState("not-found");
          return;
        }

        if (!response.ok) {
          throw new Error(`خطا در دریافت ملک: ${response.status}`);
        }

        const result: Property = await response.json();
        setProperty(result);
        setLoadState("loaded");
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState("error");
      }
    }

    void loadProperty();

    return () => controller.abort();
  }, []);

  if (loadState === "loading") {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
        <p className="text-sm font-medium text-slate-600">
          در حال دریافت اطلاعات ملک...
        </p>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            دریافت اطلاعات ملک انجام نشد
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            اتصال به سرویس اطلاعات ملک ممکن نیست. لطفاً اتصال را بررسی و دوباره تلاش کنید.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            تلاش دوباره
          </button>
          <div>
            <Link href="/search" className="mt-5 inline-block text-sm font-bold text-brand-turquoise hover:text-slate-900">
              بازگشت به جستجوی ملک
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main
        dir="rtl"
        className="
          min-h-screen
          bg-slate-50
          px-4
          py-8
        "
      >
        <div
          className="
            mx-auto
            max-w-3xl
            border
            border-slate-200
            bg-white
            p-8
            text-center
            shadow-sm
          "
        >
          <h1
            className="
              text-xl
              font-bold
              text-slate-900
            "
          >
            ملک موردنظر پیدا نشد
          </h1>

          <p
            className="
              mt-3
              text-sm
              text-slate-500
            "
          >
            ممکن است این ملک حذف شده باشد یا
            آدرس واردشده صحیح نباشد.
          </p>

          <Link
            href="/search"
            className="
              mt-6
              inline-block
              text-sm
              font-bold
              text-brand-turquoise
              hover:text-slate-900
            "
          >
            بازگشت به جستجوی ملک
          </Link>
        </div>
      </main>
    );
  }



  const propertyType = getPropertyTypeLabel(property.propertyType);

  const location = [property.city, property.district]
    .filter(Boolean)
    .join("، ");

  const price = getPriceLabel(property.listing);

  return (
    <main
      dir="rtl"
      className="
        min-h-screen
        bg-slate-50
        px-4
        py-5
        sm:px-6
        sm:py-8
      "
    >
      <div
        className="
          mx-auto
          max-w-5xl
        "
      >
        {/* ==================================================
            بازگشت به جستجو
           ================================================== */}
        <Link
          href="/search"
          className="
            mb-4
            inline-flex
            items-center
            gap-2
            text-sm
            font-bold
            text-slate-600
            transition-colors
            hover:text-slate-900
          "
        >
          <span>→</span>

          <span>
            بازگشت به جستجو
          </span>
        </Link>

        {/* ==================================================
            کارت اصلی ملک
           ================================================== */}
        <section
          className="
            overflow-hidden
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >
          {/* ==================================================
              بخش تصویر
             ================================================== */}
          <div
            className="
              flex
              min-h-[240px]
              items-center
              justify-center
              bg-slate-100
              sm:min-h-[360px]
            "
          >
            <div className="text-center text-slate-400">
              <div className="text-sm font-medium">
                تصاویر ملک
              </div>

              <div className="mt-1 text-xs">
                در مرحله بعد اضافه می‌شود
              </div>
            </div>
          </div>

          {/* ==================================================
              اطلاعات ملک
             ================================================== */}
          <div
            className="
              p-5
              sm:p-7
            "
          >
            {/* نوع ملک + وضعیت */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="
                  border
                  border-slate-200
                  px-3
                  py-1
                  text-xs
                  font-bold
                  text-slate-600
                "
              >
                {propertyType}
              </span>

              {property.isActive && (
                <span
                  className="
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-3
                    py-1
                    text-xs
                    font-bold
                    text-emerald-700
                  "
                >
                  فعال
                </span>
              )}
            </div>

            {/* عنوان */}
            <h1
              className="
                mt-4
                text-2xl
                font-bold
                tracking-tight
                text-slate-900
                sm:text-3xl
              "
            >
              {propertyType}
            </h1>

            {/* موقعیت */}
            <p
              className="
                mt-2
                text-sm
                text-slate-500
              "
            >
              {location}
            </p>

            {/* آدرس */}
            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {property.address || "نشانی دقیق برای حفظ حریم خصوصی در این صفحه نمایش داده نمی‌شود."}
            </p>

            {/* ==================================================
                قیمت
               ================================================== */}
            <div
              className="
                mt-6
                border-y
                border-slate-200
                py-5
              "
            >
              <div
                className="
                  text-xs
                  text-slate-500
                "
              >
                قیمت
              </div>

              <div
                className="
                  mt-1
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                {price}
              </div>
            </div>

            {/* ==================================================
                مشخصات اصلی
               ================================================== */}
            <div
              className="
                mt-6
                grid
                grid-cols-2
                gap-3
                sm:grid-cols-4
              "
            >
              {/* نوع ملک */}
              <div
                className="
                  border
                  border-slate-200
                  p-4
                "
              >
                <div className="text-xs text-slate-500">
                  نوع ملک
                </div>

                <div
                  className="
                    mt-1
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  {propertyType}
                </div>
              </div>

              {/* متراژ */}
              <div
                className="
                  border
                  border-slate-200
                  p-4
                "
              >
                <div className="text-xs text-slate-500">
                  متراژ
                </div>

                <div
                  className="
                    mt-1
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  {property.area != null
                    ? `${property.area} متر`
                    : "ثبت نشده"}
                </div>
              </div>

              {/* تعداد اتاق */}
              <div
                className="
                  border
                  border-slate-200
                  p-4
                "
              >
                <div className="text-xs text-slate-500">
                  اتاق
                </div>

                <div
                  className="
                    mt-1
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  {property.rooms != null
                    ? `${property.rooms} خواب`
                    : "ثبت نشده"}
                </div>
              </div>

              {/* سال ساخت */}
              <div
                className="
                  border
                  border-slate-200
                  p-4
                "
              >
                <div className="text-xs text-slate-500">
                  سال ساخت
                </div>

                <div
                  className="
                    mt-1
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  {property.yearBuilt ?? "ثبت نشده"}
                </div>
              </div>
            </div>

            {/* ==================================================
                توضیحات ملک
               ================================================== */}
            <div className="mt-7">
              <h2
                className="
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                درباره این ملک
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  leading-7
                  text-slate-600
                "
              >
                {property.description ||
                  "جزئیات تکمیلی برای نمایش عمومی در دسترس نیست."}
              </p>
            </div>

            {/* ==================================================
                دکمه‌های اقدام
               ================================================== */}
            <div
              className="
                mt-8
                grid
                gap-3
                sm:grid-cols-2
              "
            >
              <CustomerFavoriteButton propertyId={property.id} />

              <Link
                href="/request"
                className="
                  flex
                  h-12
                  items-center
                  justify-center
                  bg-slate-900
                  text-sm
                  font-bold
                  text-white
                  transition-colors
                  hover:bg-slate-800
                "
              >
                سپردن نیاز به هشتی
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
