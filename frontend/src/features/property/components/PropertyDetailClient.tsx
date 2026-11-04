"use client";

import Link from "next/link";
import { CustomerFavoriteButton } from "@/features/customer/components/CustomerFavoriteButton";
import { usePropertyDetail, type Property, type PropertyListing } from "../hooks/usePropertyDetail";

type DetailItem = { label: string; value: string };

const enumLabels: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  SHOP: "مغازه",
  OFFICE: "اداری",
  GARDEN: "باغ",
  SALE: "فروش",
  FULL_DEPOSIT: "رهن کامل",
  RENT: "اجاره",
  DEPOSIT_AND_RENT: "رهن و اجاره",
  SINGLE_SHEET: "تک‌برگ",
  OLD_DEED: "سند قدیمی",
  OFFICIAL_CONTRACT: "قرارداد رسمی",
  ORDINARY_CONTRACT: "قرارداد عادی",
  SIX_DANG: "شش‌دانگ",
  SHARED: "مشاع",
  FREEHOLD: "ملکی",
  ENDOWMENT: "وقفی",
  PENDING: "در انتظار بررسی",
  VERIFIED: "تأییدشده",
  REJECTED: "ردشده",
  NO_RENOVATION: "بدون بازسازی",
  PARTIAL: "بازسازی جزئی",
  FULL: "بازسازی کامل",
  VACANT: "خالی",
  OWNER_OCCUPIED: "ساکن مالک",
  TENANT_OCCUPIED: "در اجاره",
};

function displayEnum(value?: string | null): string {
  if (!value) return "";
  return enumLabels[value] ?? value.replaceAll("_", " ");
}

function formatNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}

function formatCurrency(value?: string | null): string | null {
  if (value == null || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `${amount.toLocaleString("fa-IR")} تومان`;
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function buildDetails(property: Property): {
  main: DetailItem[];
  facilities: DetailItem[];
  legal: DetailItem[];
  status: DetailItem[];
} {
  const main: DetailItem[] = [];
  const facilities: DetailItem[] = [];
  const legal: DetailItem[] = [];
  const status: DetailItem[] = [];

  const add = (items: DetailItem[], label: string, value: unknown, suffix = "") => {
    if (!hasValue(value)) return;
    items.push({
      label,
      value: typeof value === "number" ? `${formatNumber(value)}${suffix}` : `${String(value)}${suffix}`,
    });
  };
  const addEnum = (items: DetailItem[], label: string, value?: string | null) => {
    if (hasValue(value)) items.push({ label, value: displayEnum(value) });
  };
  const addBoolean = (items: DetailItem[], label: string, value?: boolean | null) => {
    if (value !== null && value !== undefined) {
      items.push({ label, value: value ? "دارد" : "ندارد" });
    }
  };

  addEnum(main, "نوع ملک", property.propertyType);
  add(main, "متراژ", property.area, " متر");
  add(main, "تعداد اتاق", property.rooms, " خواب");
  add(main, "سال ساخت", property.yearBuilt);
  add(main, "طبقه", property.floor);
  add(main, "شماره واحد", property.unitNumber);
  add(main, "تعداد کل واحدها", property.totalUnits);

  add(facilities, "تعداد پارکینگ", property.parkingCount);
  addEnum(facilities, "نوع پارکینگ", property.parkingType);
  addBoolean(facilities, "آسانسور", property.hasElevator);
  addBoolean(facilities, "انباری", property.hasStorage);
  addBoolean(facilities, "بالکن", property.hasBalcony);
  addBoolean(facilities, "حیاط", property.hasYard);
  addEnum(facilities, "سیستم گرمایش", property.heatingSystem);
  addEnum(facilities, "سیستم سرمایش", property.coolingSystem);

  addEnum(legal, "نوع سند", property.documentType);
  addEnum(legal, "نوع مالکیت", property.ownershipType);
  addEnum(legal, "وضعیت زمین", property.landTenure);

  addEnum(status, "وضعیت بازسازی", property.renovationStatus);
  add(status, "سال بازسازی", property.renovationYear);
  addEnum(status, "وضعیت سکونت", property.occupancyStatus);

  return { main, facilities, legal, status };
}

function DetailSection({ title, items }: { title: string; items: DetailItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-6 border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-slate-500">{item.label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function getPriceItems(listing?: PropertyListing | null): DetailItem[] {
  if (!listing) return [];
  const items: DetailItem[] = [];
  const addPrice = (label: string, value?: string | null) => {
    const formatted = formatCurrency(value);
    if (formatted) items.push({ label, value: formatted });
  };

  if (listing.transactionType === "SALE") addPrice("قیمت فروش", listing.salePrice);
  if (listing.transactionType === "FULL_DEPOSIT") addPrice("مبلغ رهن کامل", listing.depositAmount);
  if (listing.transactionType === "RENT") addPrice("اجاره ماهانه", listing.rentAmount);
  if (listing.transactionType === "DEPOSIT_AND_RENT") {
    addPrice("مبلغ رهن", listing.depositAmount);
    addPrice("اجاره ماهانه", listing.rentAmount);
  }
  return items;
}

export default function PropertyDetailClient() {
  const { property, loadState } = usePropertyDetail();

  if (loadState === "loading") {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
        <p className="text-sm font-medium text-slate-600">در حال دریافت اطلاعات ملک...</p>
      </main>
    );
  }

  if (loadState === "error" || loadState === "not-found" || !property) {
    const notFound = loadState === "not-found" || (loadState === "loaded" && !property);
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            {notFound ? "ملک موردنظر پیدا نشد" : "دریافت اطلاعات ملک انجام نشد"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {notFound
              ? "ممکن است این آگهی دیگر برای سطح دسترسی شما قابل مشاهده نباشد."
              : "اتصال به سرویس اطلاعات ملک ممکن نیست. لطفاً اتصال را بررسی و دوباره تلاش کنید."}
          </p>
          {!notFound && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              تلاش دوباره
            </button>
          )}
          <div>
            <Link href="/search" className="mt-5 inline-block text-sm font-bold text-brand-turquoise hover:text-slate-900">
              بازگشت به جستجوی ملک
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const propertyType = displayEnum(property.propertyType);
  const transactionType = displayEnum(property.listing?.transactionType);
  const location = [property.city, property.district].filter(Boolean).join("، ");
  const details = buildDetails(property);
  const priceItems = getPriceItems(property.listing);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/search"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
        >
          <span aria-hidden="true">→</span>
          <span>بازگشت به جستجو</span>
        </Link>

        <article className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <section aria-label="تصاویر آگهی" className="bg-slate-100 p-2 sm:p-3">
            {property.media.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {property.media.map((media, index) => (
                  <a
                    key={`${media.url}-${media.sortOrder}`}
                    href={media.url}
                    target="_blank"
                    rel="noreferrer"
                    className={index === 0 ? "col-span-2 row-span-2 overflow-hidden bg-white sm:col-span-2" : "overflow-hidden bg-white"}
                    aria-label={`نمایش تصویر شماره ${index + 1} ملک`}
                  >
                    <img
                      src={media.url}
                      alt={`تصویر ${index + 1} ملک ${property.city} ${property.district}`}
                      className={index === 0 ? "h-64 w-full object-cover sm:h-[420px]" : "h-32 w-full object-cover sm:h-48"}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-400 sm:min-h-[360px]">
                تصویری برای این آگهی ثبت نشده است
              </div>
            )}
          </section>

          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                {propertyType}
              </span>
              {transactionType && (
                <span className="border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                  {transactionType}
                </span>
              )}
              {property.isActive && (
                <span className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  فعال
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {propertyType}{property.area != null ? ` ${formatNumber(property.area)} متری` : ""}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{location}</p>
            <p className="mt-1 text-xs text-slate-400">
              موقعیت تقریبی ملک برای حفظ حریم خصوصی نمایش داده می‌شود؛ نشانی دقیق منتشر نمی‌شود.
            </p>

            {priceItems.length > 0 && (
              <section className="mt-6 border-y border-slate-200 py-5" aria-label="قیمت ملک">
                <h2 className="text-sm font-bold text-slate-700">اطلاعات قیمت</h2>
                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {priceItems.map((item) => (
                    <div key={item.label} className="border border-slate-200 bg-slate-50 p-4">
                      <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
                      <dd className="mt-2 text-lg font-bold text-slate-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <DetailSection title="مشخصات اصلی ملک" items={details.main} />
            <DetailSection title="امکانات و تجهیزات" items={details.facilities} />
            <DetailSection title="اطلاعات حقوقی و سند" items={details.legal} />
            <DetailSection title="وضعیت و شرایط ملک" items={details.status} />

            {property.description?.trim() && (
              <section className="mt-6 border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900">توضیحات ملک</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-600">
                  {property.description}
                </p>
              </section>
            )}

            {property.ownerDetails && (
              <section className="mt-6 border border-slate-200 bg-white p-4" aria-label="مشخصات مالک">
                <h2 className="font-bold text-slate-900">مشخصات مالک</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {[property.ownerDetails.firstName, property.ownerDetails.lastName].filter(Boolean).join(" ")}
                </p>
                {property.ownerDetails.mobile && (
                  <a href={`tel:${property.ownerDetails.mobile}`} dir="ltr" className="mt-2 inline-flex min-h-10 items-center border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">
                    {property.ownerDetails.mobile}
                  </a>
                )}
              </section>
            )}

            {property.contact && (
              <section className="mt-6 border border-slate-200 bg-slate-50 p-4" aria-label="اطلاعات تماس">
                <h2 className="font-bold text-slate-900">تماس با {property.contact.label}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {property.contact.firstName} {property.contact.lastName}
                </p>
                <a href={`tel:${property.contact.mobile}`} dir="ltr" className="mt-2 inline-flex min-h-10 items-center bg-[#043873] px-4 py-2 font-bold text-white">
                  {property.contact.mobile}
                </a>
              </section>
            )}

            <div className="mt-8">
              <CustomerFavoriteButton propertyId={property.id} />
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
