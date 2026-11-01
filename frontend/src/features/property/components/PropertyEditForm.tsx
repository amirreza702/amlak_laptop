"use client";

import { useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import type { Coordinates, PropertyType, TransactionType } from "../types/propertyRegistration";
import { PropertyMediaEditor } from "./PropertyMediaEditor";

const LocationPicker = dynamic(() => import("./PropertyLocationPicker"), { ssr: false });
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm";

type Values = {
  propertyType: PropertyType; city: string; district: string; address: string; postalCode: string;
  latitudeExact: string; longitudeExact: string; area: string; rooms: string; floor: string;
  yearBuilt: string; unitNumber: string; totalUnits: string; parkingCount: string; parkingType: string; parkingNumber: string;
  hasElevator: string; hasStorage: string; hasBalcony: string; hasYard: string; heatingSystem: string; coolingSystem: string;
  documentType: string; ownershipType: string; landTenure: string; description: string;
  renovationStatus: string; renovationYear: string; occupancyStatus: string;
  ownerMobile: string; ownerFirstName: string; ownerLastName: string; transactionType: TransactionType; salePrice: string; depositAmount: string; rentAmount: string; internalNote: string;
};

const emptyValues: Values = {
  propertyType: "APARTMENT", city: "", district: "", address: "", postalCode: "",
  latitudeExact: "", longitudeExact: "", area: "", rooms: "", floor: "",
  yearBuilt: "", unitNumber: "", totalUnits: "1", parkingCount: "", parkingType: "", parkingNumber: "",
  hasElevator: "", hasStorage: "", hasBalcony: "", hasYard: "", heatingSystem: "", coolingSystem: "",
  documentType: "", ownershipType: "", landTenure: "", description: "", renovationStatus: "", renovationYear: "",
  occupancyStatus: "VACANT", ownerMobile: "", ownerFirstName: "", ownerLastName: "", transactionType: "SALE", salePrice: "", depositAmount: "", rentAmount: "", internalNote: "",
};

const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);
const boolOrNull = (value: string) => value === "" ? null : value === "true";

export function PropertyEditForm({
  propertyId,
  mode,
  onClose,
  onSaved,
  initialInternalNote = "",
  onSavePrivateNote,
}: {
  propertyId: string;
  mode: "owner" | "agent";
  onClose: () => void;
  onSaved: () => void;
  initialInternalNote?: string;
  onSavePrivateNote?: (propertyId: string, note: string) => Promise<boolean>;
}) {
  const [values, setValues] = useState<Values>({ ...emptyValues, internalNote: initialInternalNote });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasListing, setHasListing] = useState(false);
  const [identity, setIdentity] = useState({
    registrantName: "",
    registrantMobile: "",
    approvedAgentName: "",
    approvedAgentMobile: "",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      setHasListing(false);
      try {
        const response = await fetch(`${API_URL}/properties/${encodeURIComponent(propertyId)}`, { credentials: "include", cache: "no-store" });
        const property = await response.json();
        if (!response.ok) throw new Error(property.message || "دریافت اطلاعات ملک ناموفق بود.");
        if (!property || property.id !== propertyId) throw new Error("پاسخ سرور برای این شناسه ملک معتبر نیست.");
        const listing = property.listing ?? null;
        if (!active) return;
        setIdentity({
          registrantName: [property.registrantFirstName, property.registrantLastName].filter(Boolean).join(" "),
          registrantMobile: property.registrantMobile ?? "",
          approvedAgentName: [property.approvedAgentFirstName, property.approvedAgentLastName].filter(Boolean).join(" "),
          approvedAgentMobile: property.approvedAgentMobile ?? "",
        });
        setHasListing(listing !== null);
        setValues({
          propertyType: property.propertyType ?? "APARTMENT",
          city: property.city ?? "", district: property.district ?? "", address: property.address ?? "",
          postalCode: property.postalCode ?? "", latitudeExact: String(property.latitudeExact ?? ""),
          longitudeExact: String(property.longitudeExact ?? ""), area: String(property.area ?? ""),
          rooms: String(property.rooms ?? ""), floor: String(property.floor ?? ""),
          yearBuilt: String(property.yearBuilt ?? ""), unitNumber: property.unitNumber ?? "",
          totalUnits: String(property.totalUnits ?? ""), parkingCount: String(property.parkingCount ?? ""),
          parkingType: property.parkingType ?? "", parkingNumber: property.parkingNumber ?? "",
          hasElevator: property.hasElevator == null ? "" : String(property.hasElevator),
          hasStorage: property.hasStorage == null ? "" : String(property.hasStorage),
          hasBalcony: property.hasBalcony == null ? "" : String(property.hasBalcony),
          hasYard: property.hasYard == null ? "" : String(property.hasYard),
          heatingSystem: property.heatingSystem ?? "", coolingSystem: property.coolingSystem ?? "",
          documentType: property.documentType ?? "", ownershipType: property.ownershipType ?? "",
          landTenure: property.landTenure ?? "", description: property.description ?? "",
          renovationStatus: property.renovationStatus ?? "", renovationYear: String(property.renovationYear ?? ""),
          occupancyStatus: property.occupancyStatus ?? "VACANT",
          ownerMobile: property.ownerMobile ?? "",
          ownerFirstName: property.ownerFirstName ?? "", ownerLastName: property.ownerLastName ?? "",
          transactionType: listing?.transactionType ?? "SALE",
          salePrice: String(listing?.salePrice ?? ""), depositAmount: String(listing?.depositAmount ?? ""),
          rentAmount: String(listing?.rentAmount ?? ""), internalNote: initialInternalNote,
        });
      } catch (cause) {
        if (active) {
          setLoadFailed(true);
          setError(cause instanceof Error ? cause.message : "دریافت اطلاعات ملک ناموفق بود.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [propertyId, initialInternalNote]);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      if (!values.latitudeExact || !values.longitudeExact) throw new Error("موقعیت ملک را روی نقشه انتخاب کنید.");
      const details = {
        propertyType: values.propertyType, city: values.city.trim(), district: values.district.trim(), address: values.address.trim(),
        postalCode: values.postalCode.trim() || null,
        latitudeExact: Number(values.latitudeExact), longitudeExact: Number(values.longitudeExact),
        area: Number(values.area), rooms: numberOrNull(values.rooms), floor: numberOrNull(values.floor),
        yearBuilt: numberOrNull(values.yearBuilt), unitNumber: values.unitNumber.trim() || null,
        totalUnits: numberOrNull(values.totalUnits), parkingCount: numberOrNull(values.parkingCount),
        parkingType: values.parkingType || null, parkingNumber: values.parkingNumber || null,
        hasElevator: boolOrNull(values.hasElevator), hasStorage: boolOrNull(values.hasStorage),
        hasBalcony: boolOrNull(values.hasBalcony), hasYard: boolOrNull(values.hasYard),
        heatingSystem: values.heatingSystem || null, coolingSystem: values.coolingSystem || null,
        documentType: values.documentType || null, ownershipType: values.ownershipType || null,
        landTenure: values.landTenure || null, description: values.description.trim() || null,
        renovationStatus: values.renovationStatus || null, renovationYear: numberOrNull(values.renovationYear),
        occupancyStatus: values.occupancyStatus,
        ...(mode === "agent" ? { ownerFirstName: values.ownerFirstName.trim(), ownerLastName: values.ownerLastName.trim(), ownerMobile: values.ownerMobile.trim() } : {}),
      };
      if (mode === "agent" && (!details.ownerFirstName || !details.ownerLastName || details.ownerFirstName.length > 80 || details.ownerLastName.length > 100)) throw new Error("نام و نام خانوادگی مالک را به‌درستی وارد کنید.");
      if (mode === "agent" && !/^09\d{9}$/.test(values.ownerMobile.trim())) throw new Error("شماره تماس مالک باید یک شماره معتبر ۱۱ رقمی ایران باشد.");
      if (!details.city || !details.address || !Number.isFinite(details.area) || details.area <= 0 ||
          (details.rooms != null && (!Number.isInteger(details.rooms) || details.rooms < 0)) ||
          (details.floor != null && !Number.isInteger(details.floor)) ||
          (details.totalUnits != null && (!Number.isInteger(details.totalUnits) || details.totalUnits < 1)) ||
          !details.documentType || !details.ownershipType || !details.landTenure) {
        throw new Error("فیلدهای ستاره‌دار را با مقادیر معتبر تکمیل کنید.");
      }
      const price = {
        transactionType: values.transactionType,
        salePrice: values.transactionType === "SALE" ? values.salePrice.trim() : null,
        depositAmount: values.transactionType === "FULL_DEPOSIT" ? values.depositAmount.trim() : null,
        rentAmount: values.transactionType === "RENT" ? values.rentAmount.trim() : null,
      };
      const requiredPrice = values.transactionType === "SALE" ? price.salePrice : values.transactionType === "FULL_DEPOSIT" ? price.depositAmount : price.rentAmount;
      if (!requiredPrice || !/^[0-9]+$/.test(requiredPrice) || !Number.isFinite(Number(requiredPrice)) || Number(requiredPrice) <= 0) throw new Error("مبلغ مربوط به نوع معامله را به تومان و به‌صورت عدد صحیح مثبت وارد کنید.");

      const updateResponse = await fetch(`${API_URL}/properties/${encodeURIComponent(propertyId)}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details),
      });
      const updateBody = await updateResponse.json().catch(() => ({}));
      if (!updateResponse.ok) throw new Error(updateBody.message || "ذخیره مشخصات ملک ناموفق بود.");

      const priceResponse = await fetch(`${API_URL}/properties/${encodeURIComponent(propertyId)}${hasListing ? "/price" : "/listing"}`, {
        method: hasListing ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(price),
      });
      const priceBody = await priceResponse.json().catch(() => ({}));
      if (!priceResponse.ok) throw new Error(priceBody.message || "ذخیره قیمت ناموفق بود.");

      if (mode === "agent" && onSavePrivateNote) {
        const saved = await onSavePrivateNote(propertyId, values.internalNote);
        if (!saved) throw new Error("مشخصات ملک ذخیره شد، اما یادداشت خصوصی ذخیره نشد.");
      }
      setNotice("تغییرات ملک با موفقیت ذخیره شد.");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره تغییرات ناموفق بود.");
    } finally { setSaving(false); }
  }

  const isLandLike = values.propertyType === "LAND" || values.propertyType === "GARDEN";
  const coordinateValue: Coordinates | null = values.latitudeExact && values.longitudeExact
    ? { latitude: Number(values.latitudeExact), longitude: Number(values.longitudeExact) }
    : null;

  if (loading) return <p className="p-4 text-sm text-slate-500">در حال دریافت اطلاعات فعلی ملک...</p>;
  if (loadFailed) return <div dir="rtl" className="space-y-3 p-4"><p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">بستن فرم</button></div>;

  return (
    <form onSubmit={submit} className="max-h-[78vh] space-y-4 overflow-y-auto p-1" dir="rtl">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {(identity.registrantName || identity.approvedAgentName) && <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
        {identity.registrantName && <div><p className="text-xs text-slate-500">مشاور ثبت‌کننده</p><p className="mt-1 font-semibold">{identity.registrantName}</p>{identity.registrantMobile && <p dir="ltr" className="mt-1 text-sm text-slate-600">{identity.registrantMobile}</p>}</div>}
        {identity.approvedAgentName && <div><p className="text-xs text-slate-500">مشاور تأییدشده</p><p className="mt-1 font-semibold">{identity.approvedAgentName}</p>{identity.approvedAgentMobile && <p dir="ltr" className="mt-1 text-sm text-slate-600">{identity.approvedAgentMobile}</p>}</div>}
      </section>}
      <section className="space-y-3 rounded-xl border border-slate-200 p-3">
        <h3 className="font-bold">۱. فیلدهای الزامی</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">نوع ملک *<select required value={values.propertyType} onChange={e=>update("propertyType",e.target.value as PropertyType)} className={inputClass}>{[["APARTMENT","آپارتمان"],["HOUSE","خانه"],["VILLA","ویلا"],["LAND","زمین"],["SHOP","مغازه"],["OFFICE","اداری"],["GARDEN","باغ"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label className="space-y-1 text-sm">شهر / روستا *<input required maxLength={100} value={values.city} onChange={e=>update("city",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">نشانی ملک *<input required maxLength={500} value={values.address} onChange={e=>update("address",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">شماره تماس مالک *<input type="tel" inputMode="numeric" dir="ltr" pattern="09[0-9]{9}" maxLength={11} required readOnly={mode === "owner"} value={values.ownerMobile} onChange={e=>update("ownerMobile",e.target.value)} placeholder="" className={inputClass}/><span className="text-xs text-slate-500">{mode === "agent" ? "مشخصات مالک برای مشاور ثبت‌کننده همین ملک قابل مشاهده است." : "شماره و مشخصات حساب مالک؛ فقط برای مالک، مشاور تأییدشده همان ملک و هشتی قابل مشاهده است."}</span></label>
          {mode === "owner" && <>
            <label className="space-y-1 text-sm">نام مالک<input readOnly value={values.ownerFirstName} className={inputClass}/></label>
            <label className="space-y-1 text-sm">نام خانوادگی مالک<input readOnly value={values.ownerLastName} className={inputClass}/></label>
          </>}
          {mode === "agent" && <>
            <label className="space-y-1 text-sm">نام مالک *<input required maxLength={80} autoComplete="given-name" value={values.ownerFirstName} onChange={e=>update("ownerFirstName",e.target.value)} className={inputClass}/></label>
            <label className="space-y-1 text-sm">نام خانوادگی مالک *<input required maxLength={100} autoComplete="family-name" value={values.ownerLastName} onChange={e=>update("ownerLastName",e.target.value)} className={inputClass}/></label>
          </>}
          <label className="space-y-1 text-sm">متراژ *<input required type="number" min="0.1" step="any" value={values.area} onChange={e=>update("area",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">نوع سند *<select required value={values.documentType} onChange={e=>update("documentType",e.target.value)} className={inputClass}><option value="">انتخاب کنید</option><option value="SINGLE_SHEET">تک‌برگ</option><option value="OLD_DEED">دفترچه‌ای</option><option value="OFFICIAL_CONTRACT">قرارداد رسمی</option><option value="ORDINARY_CONTRACT">قولنامه عادی</option></select></label>
          <label className="space-y-1 text-sm">نوع مالکیت *<select required value={values.ownershipType} onChange={e=>update("ownershipType",e.target.value)} className={inputClass}><option value="">انتخاب کنید</option><option value="SIX_DANG">شش‌دانگ</option><option value="SHARED">مشاع</option></select></label>
          <label className="space-y-1 text-sm">وضعیت عرصه *<select required value={values.landTenure} onChange={e=>update("landTenure",e.target.value)} className={inputClass}><option value="">انتخاب کنید</option><option value="FREEHOLD">ملکی</option><option value="ENDOWMENT">اوقافی</option></select></label>
        </div>
      </section>

      <fieldset className="space-y-2 rounded-xl border p-3"><legend className="px-2 text-sm font-bold">موقعیت ملک *</legend><LocationPicker value={coordinateValue} onChange={point=>setValues(v=>({...v,latitudeExact:point?String(point.latitude):"",longitudeExact:point?String(point.longitude):""}))} city={values.city}/></fieldset>
      <section className="space-y-3 rounded-xl border p-3">
        <h3 className="font-bold">نوع معامله و قیمت *</h3>
        <label className="block space-y-1 text-sm">نوع معامله<select required value={values.transactionType} onChange={e=>update("transactionType",e.target.value as TransactionType)} className={inputClass}><option value="SALE">فروش</option><option value="FULL_DEPOSIT">رهن کامل</option><option value="RENT">اجاره</option></select></label>
        {values.transactionType==="SALE" && <label className="block space-y-1 text-sm">قیمت فروش (تومان) *<input required type="number" min="1" value={values.salePrice} onChange={e=>update("salePrice",e.target.value)} className={inputClass}/></label>}
        {values.transactionType==="FULL_DEPOSIT" && <label className="block space-y-1 text-sm">مبلغ رهن (تومان) *<input required type="number" min="1" value={values.depositAmount} onChange={e=>update("depositAmount",e.target.value)} className={inputClass}/></label>}
        {values.transactionType==="RENT" && <label className="block space-y-1 text-sm">اجاره ماهانه (تومان) *<input required type="number" min="1" value={values.rentAmount} onChange={e=>update("rentAmount",e.target.value)} className={inputClass}/></label>}
      </section>
      <section className="space-y-3 rounded-xl border border-slate-200 p-3">
        <h3 className="font-bold">جزئیات اختیاری ملک</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">محله / منطقه (اختیاری)<input maxLength={120} value={values.district} onChange={e=>update("district",e.target.value)} className={inputClass}/></label>
          {!isLandLike && <label className="space-y-1 text-sm">تعداد اتاق (اختیاری)<input type="number" min="0" step="1" value={values.rooms} onChange={e=>update("rooms",e.target.value)} className={inputClass}/></label>}
          {!isLandLike && <label className="space-y-1 text-sm">طبقه (اختیاری)<input type="number" min="-10" max="200" step="1" value={values.floor} onChange={e=>update("floor",e.target.value)} className={inputClass}/></label>}
          {!isLandLike && <label className="space-y-1 text-sm">تعداد کل واحدها (اختیاری)<input type="number" min="1" step="1" value={values.totalUnits} onChange={e=>update("totalUnits",e.target.value)} className={inputClass}/></label>}

          <label className="space-y-1 text-sm">کد پستی<input maxLength={10} value={values.postalCode} onChange={e=>update("postalCode",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">سال ساخت<input type="number" min="1300" max="1500" value={values.yearBuilt} onChange={e=>update("yearBuilt",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">شماره واحد<input value={values.unitNumber} onChange={e=>update("unitNumber",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">تعداد پارکینگ<input type="number" min="0" value={values.parkingCount} onChange={e=>update("parkingCount",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">نوع پارکینگ<input value={values.parkingType} onChange={e=>update("parkingType",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">شماره پارکینگ<input value={values.parkingNumber} onChange={e=>update("parkingNumber",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">سیستم گرمایش<input value={values.heatingSystem} onChange={e=>update("heatingSystem",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">سیستم سرمایش<input value={values.coolingSystem} onChange={e=>update("coolingSystem",e.target.value)} className={inputClass}/></label>
          {!isLandLike && ([["hasElevator","آسانسور"],["hasStorage","انباری"],["hasBalcony","بالکن"],["hasYard","حیاط"]] as const).map(([key,label])=><label key={key} className="space-y-1 text-sm">{label}<select value={values[key]} onChange={e=>update(key,e.target.value)} className={inputClass}><option value="">نامشخص</option><option value="true">دارد</option><option value="false">ندارد</option></select></label>)}
          <label className="space-y-1 text-sm">سال بازسازی<input type="number" min="1300" max="1500" value={values.renovationYear} onChange={e=>update("renovationYear",e.target.value)} className={inputClass}/></label>
          <label className="space-y-1 text-sm">وضعیت بازسازی<select value={values.renovationStatus} onChange={e=>update("renovationStatus",e.target.value)} className={inputClass}><option value="">نامشخص</option><option value="NO_RENOVATION">بدون بازسازی</option><option value="PARTIAL">جزئی</option><option value="FULL">کامل</option></select></label>
          <label className="space-y-1 text-sm">وضعیت سکونت<select value={values.occupancyStatus} onChange={e=>update("occupancyStatus",e.target.value)} className={inputClass}><option value="VACANT">خالی</option><option value="OWNER_OCCUPIED">مالک ساکن است</option><option value="TENANT_OCCUPIED">مستأجر دارد</option></select></label>
          <label className="col-span-full space-y-1 text-sm">توضیحات<textarea rows={4} maxLength={10000} value={values.description} onChange={e=>update("description",e.target.value)} className={inputClass}/></label>
        </div>
      </section>
      {mode==="agent" && <label className="block space-y-1 text-sm">یادداشت خصوصی مشاور<textarea rows={3} maxLength={10000} value={values.internalNote} onChange={e=>update("internalNote",e.target.value)} className={inputClass}/></label>}
      <PropertyMediaEditor propertyId={propertyId} onError={setError}/>
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border px-4 py-2">انصراف</button><button type="submit" disabled={saving} className="rounded-lg bg-[#043873] px-4 py-2 font-bold text-white disabled:opacity-50">{saving?"در حال ذخیره...":"ذخیره همه تغییرات"}</button></div>
    </form>
  );
}
