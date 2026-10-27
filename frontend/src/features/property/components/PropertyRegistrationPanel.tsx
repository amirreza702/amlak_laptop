"use client";

import dynamic from "next/dynamic";
import { useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// نقشه به صورت client-only بارگذاری می‌شود تا Leaflet در Static Export به window وابسته نشود.
const PropertyLocationPicker = dynamic(
  () => import("./PropertyLocationPicker"),
  {
    ssr: false,
    loading: () => <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-96">در حال بارگذاری نقشه...</div>,
  }
);

type PropertyType = "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
type TransactionType = "SALE" | "FULL_DEPOSIT" | "RENT";

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "SHOP", label: "مغازه" },
  { value: "OFFICE", label: "اداری" },
  { value: "GARDEN", label: "باغ" },
];

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: "SALE", label: "فروش" },
  { value: "FULL_DEPOSIT", label: "رهن کامل" },
  { value: "RENT", label: "اجاره" },
];

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#043873] focus:ring-2 focus:ring-blue-100";

interface PropertyRegistrationPanelProps {
  mode: "owner" | "agent";
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

export function PropertyRegistrationPanel({ mode }: PropertyRegistrationPanelProps) {
  const [propertyType, setPropertyType] = useState<PropertyType>("APARTMENT");
  const [transactionType, setTransactionType] = useState<TransactionType>("SALE");
  const [city, setCity] = useState("شاهرود");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [area, setArea] = useState("");
  const [rooms, setRooms] = useState("");
  const [floor, setFloor] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [listingCreated, setListingCreated] = useState(false);

  async function submitListing(propertyId: string) {
    const listingResponse = await fetch(`${API_URL}/properties/${propertyId}/listing`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionType,
        salePrice: transactionType === "SALE" ? salePrice.trim() : null,
        depositAmount: transactionType === "FULL_DEPOSIT" ? depositAmount.trim() : null,
        rentAmount: transactionType === "RENT" ? rentAmount.trim() : null,
      }),
    });
    const listingBody = await listingResponse.json().catch(() => ({})) as { message?: string; code?: string };
    if (!listingResponse.ok) {
      if (listingResponse.status === 401) {
        throw new Error("نشست ورود معتبر نیست یا منقضی شده است. بدون بستن فرم، دوباره وارد حساب شوید و سپس ثبت معامله را ادامه دهید.");
      }
      if (listingBody.code === "AGENT_NOT_VERIFIED") {
        throw new Error("حساب مشاور هنوز توسط هشتی تأیید نشده است؛ پس از تأیید حساب می‌توانید اطلاعات معامله را ثبت کنید.");
      }
      throw new Error(listingBody.message || `ثبت اطلاعات معامله ناموفق بود (خطای ${listingResponse.status}). می‌توانید دوباره تلاش کنید.`);
    }
    setListingCreated(true);
    setMessage("اطلاعات ملک و معامله با موفقیت ثبت شد. آگهی هنوز منتشر نشده و برای انتشار باید مراحل بررسی و تأیید هشتی طی شود.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      // اگر خود ملک قبلاً ثبت شده و فقط ثبت Listing ناموفق بوده، ملک را دوباره ایجاد نکن.
      if (createdPropertyId && !listingCreated) {
        await submitListing(createdPropertyId);
        return;
      }

      if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
        throw new Error("برای ثبت ملک، محل دقیق آن را روی نقشه انتخاب کنید.");
      }
      if (transactionType === "SALE" && !(Number(salePrice) > 0)) {
        throw new Error("قیمت فروش باید بیشتر از صفر باشد.");
      }
      if (transactionType === "FULL_DEPOSIT" && !(Number(depositAmount) > 0)) {
        throw new Error("مبلغ رهن کامل باید بیشتر از صفر باشد.");
      }
      if (transactionType === "RENT" && !(Number(rentAmount) > 0)) {
        throw new Error("مبلغ اجاره باید بیشتر از صفر باشد.");
      }

      const response = await fetch(`${API_URL}/properties`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        // شناسه مالک/مشاور ارسال نمی‌شود؛ Route آن را از نشست معتبر استخراج می‌کند.
        body: JSON.stringify({
          propertyType,
          city: city.trim(),
          district: district.trim(),
          address: address.trim(),
          postalCode: postalCode.trim() || null,
          latitudeExact: coordinates.latitude,
          longitudeExact: coordinates.longitude,
          area: area.trim() ? Number(area) : null,
          rooms: rooms.trim() ? Number(rooms) : null,
          floor: floor.trim() ? Number(floor) : null,
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        message?: string;
        code?: string;
        property?: { id?: string };
      };
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("نشست ورود معتبر نیست یا منقضی شده است. فرم حفظ شده؛ دوباره وارد حساب شوید و سپس ثبت را ادامه دهید.");
        }
        if (body.code === "AGENT_NOT_VERIFIED") {
          throw new Error("حساب مشاور هنوز توسط هشتی تأیید نشده است؛ پس از تأیید حساب می‌توانید ملک ثبت کنید.");
        }
        throw new Error(body.message || `ثبت ملک ناموفق بود (خطای ${response.status}). اطلاعات را بررسی و دوباره تلاش کنید.`);
      }

      const propertyId = body.property?.id;
      if (!propertyId) {
        throw new Error("پاسخ سرور شناسه ملک را برنگرداند؛ پیش از ثبت مجدد، فهرست املاک را بررسی کنید.");
      }

      setCreatedPropertyId(propertyId);
      await submitListing(propertyId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت اطلاعات ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900">ثبت ملک و اطلاعات معامله</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {mode === "owner"
            ? "مشخصات ملک و نوع معامله را ثبت کنید. ادعای مالکیت باید توسط هشتی تأیید شود؛ ثبت اطلاعات به معنی انتشار آگهی نیست."
            : "مشخصات ملک و نوع معامله را ثبت کنید. هویت مشاور از نشست امن سرور تعیین می‌شود و دسترسی به ملک تابع تأییدهای لازم است."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={Boolean(createdPropertyId) || busy} className="space-y-4 disabled:opacity-70">
          <legend className="mb-3 text-base font-bold">۱. مشخصات ملک</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>نوع ملک
              <select className={inputClass} value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)} required>
                {propertyTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>شهر
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required maxLength={100} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>محله / منطقه
              <input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} required maxLength={120} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>نشانی ملک
              <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={500} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">کد پستی (اختیاری)
              <input className={inputClass} inputMode="numeric" pattern="[0-9]{10}" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="۱۰ رقم" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">متراژ (مترمربع، اختیاری)
              <input className={inputClass} type="number" min="0.1" step="0.1" value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">تعداد اتاق (اختیاری)
              <input className={inputClass} type="number" min="0" max="100" step="1" value={rooms} onChange={(e) => setRooms(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">طبقه (اختیاری)
              <input className={inputClass} type="number" min="0" max="200" step="1" value={floor} onChange={(e) => setFloor(e.target.value)} />
            </label>
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-bold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>موقعیت جغرافیایی (اجباری)</legend>
            <PropertyLocationPicker value={coordinates} onChange={setCoordinates} city={city} />
          </fieldset>
        </fieldset>

        <fieldset disabled={listingCreated || busy} className="space-y-4 rounded-xl border border-slate-200 p-4 disabled:opacity-70">
          <legend className="px-2 text-base font-bold">۲. نوع معامله و قیمت</legend>
          <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>نوع معامله
            <select className={inputClass} value={transactionType} onChange={(e) => setTransactionType(e.target.value as TransactionType)} required>
              {transactionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {transactionType === "SALE" && (
            <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>قیمت فروش (تومان)
              <input className={inputClass} type="number" min="1" step="1" inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required />
            </label>
          )}
          {transactionType === "FULL_DEPOSIT" && (
            <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>مبلغ رهن کامل (تومان)
              <input className={inputClass} type="number" min="1" step="1" inputMode="numeric" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
            </label>
          )}
          {transactionType === "RENT" && (
            <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>مبلغ اجاره ماهانه (تومان)
              <input className={inputClass} type="number" min="1" step="1" inputMode="numeric" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required />
            </label>
          )}
          <p className="text-xs leading-6 text-slate-500">طبق منطق فعلی سرور، برای فروش قیمت فروش، برای رهن کامل مبلغ رهن و برای اجاره مبلغ اجاره الزامی است.</p>
        </fieldset>

        {createdPropertyId && !listingCreated && (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-900">
            ملک با شناسه زیر ثبت شده، اما اطلاعات معامله هنوز ثبت نشده است. با زدن دکمه تلاش مجدد فقط معامله ثبت می‌شود و ملک تکراری ساخته نخواهد شد.
            <span className="mt-2 block break-all font-mono text-xs" dir="ltr">{createdPropertyId}</span>
          </p>
        )}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-7 text-red-800">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-7 text-emerald-800">{message}{createdPropertyId && <span className="mt-2 block break-all font-mono text-xs" dir="ltr">شناسه ملک: {createdPropertyId}</span>}</p>}

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="submit" disabled={busy || listingCreated} className="min-h-11 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "در حال ثبت..." : createdPropertyId && !listingCreated ? "تلاش دوباره برای ثبت معامله" : listingCreated ? "ثبت کامل شد" : "ثبت ملک و اطلاعات معامله"}
          </button>
        </div>
      </form>
    </section>
  );
}
