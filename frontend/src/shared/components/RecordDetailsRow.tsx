"use client";

import { useState, useSyncExternalStore, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/shared/components/Modal";
import dynamic from "next/dynamic";

const RecordLocationMap = dynamic(() => import("@/shared/components/RecordLocationMap"), { ssr: false });

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type RecordDetailsRowProps = {
  record: unknown;
  title?: string;
  className?: string;
  children: ReactNode;
};

const formFieldLabels: Record<string, string> = {
  firstName: "نام",
  lastName: "نام خانوادگی",
  mobile: "شماره موبایل",
  role: "نقش حساب",
  isActive: "وضعیت حساب",
  isSuperAdmin: "مدیر ارشد",
  verificationStatus: "وضعیت تأیید مشاور",
  contactName: "نام مخاطب مجاز",
  contactMobile: "شماره تماس مخاطب مجاز",
  requesterFirstName: "نام مشتری",
  requesterLastName: "نام خانوادگی مشتری",
  requesterMobile: "شماره تماس مشتری",
  registrantFirstName: "نام مشاور ثبت‌کننده",
  registrantLastName: "نام خانوادگی مشاور ثبت‌کننده",
  registrantMobile: "شماره تماس مشاور ثبت‌کننده",
  approvedAgentFirstName: "نام مشاور تأییدشده",
  approvedAgentLastName: "نام خانوادگی مشاور تأییدشده",
  approvedAgentMobile: "شماره تماس مشاور تأییدشده",
  ownerFirstName: "نام مالک",
  ownerLastName: "نام خانوادگی مالک",
  ownerMobile: "شماره تماس مالک",
  agencyName: "نام آژانس",
  address: "نشانی ملک",
  city: "شهر / روستا",
  district: "محله / منطقه",
  postalCode: "کد پستی",
  propertyType: "نوع ملک",
  transactionType: "نوع معامله",
  description: "توضیحات",
  reason: "دلیل",
  note: "یادداشت خصوصی",
  entityType: "نوع مورد مرتبط",
  area: "متراژ",
  rooms: "تعداد اتاق",
  floor: "طبقه",
  latitude: "عرض جغرافیایی",
  longitude: "طول جغرافیایی",
  latitudeExact: "عرض جغرافیایی",
  longitudeExact: "طول جغرافیایی",
  salePrice: "قیمت فروش (تومان)",
  depositAmount: "مبلغ رهن (تومان)",
  rentAmount: "مبلغ اجاره (تومان)",
  budget: "بودجه",
  minBudget: "حداقل بودجه",
  maxBudget: "حداکثر بودجه",
  minArea: "حداقل متراژ",
  maxArea: "حداکثر متراژ",
  minRooms: "حداقل اتاق",
  maxRooms: "حداکثر اتاق",
  amenities: "امکانات",
  features: "ویژگی‌ها",
  propertyAge: "سن بنا",
  buildingAge: "سن بنا",
  yearBuilt: "سال ساخت",
  renovationStatus: "وضعیت بازسازی",
  renovationYear: "سال بازسازی",
  occupancyStatus: "وضعیت سکونت",
  parking: "پارکینگ",
  parkingCount: "تعداد پارکینگ",
  parkingType: "نوع پارکینگ",
  parkingNumber: "شماره پارکینگ",
  elevator: "آسانسور",
  hasElevator: "آسانسور",
  storage: "انباری",
  hasStorage: "انباری",
  balcony: "بالکن",
  hasBalcony: "بالکن",
  hasYard: "حیاط",
  heatingSystem: "سیستم گرمایش",
  coolingSystem: "سیستم سرمایش",
  unit: "واحد",
  unitNumber: "شماره واحد",
  totalUnits: "تعداد کل واحدها",
  documentType: "نوع سند",
  ownershipType: "نوع مالکیت",
  landTenure: "نوع زمین / عرصه",
  share: "سهم مالکیت",
  isPrimary: "مالک اصلی",
  hashtiVerified: "تأیید هشتی",
  adminPermissions: "مجوزهای دسترسی",
};

const formFieldKeys = new Set(Object.keys(formFieldLabels));
const hiddenField = /^(id|.*Id|createdAt|updatedAt|deletedAt|createdBy.*|updatedBy.*|registrationSource|internalNote|privateNote|password.*|.*token|.*secret|authorization|cookie|credential)$/i;

const enumLabels: Record<string, Record<string, string>> = {
  propertyType: { APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ" },
  transactionType: { SALE: "فروش", FULL_DEPOSIT: "رهن کامل", RENT: "اجاره" },
  documentType: { SINGLE_SHEET: "تک‌برگ", OLD_DEED: "دفترچه‌ای", OFFICIAL_CONTRACT: "قرارداد رسمی", ORDINARY_CONTRACT: "قولنامه عادی" },
  ownershipType: { SIX_DANG: "شش‌دانگ", SHARED: "مشاع" },
  landTenure: { FREEHOLD: "ملکی", ENDOWMENT: "اوقافی" },
  renovationStatus: { NO_RENOVATION: "بدون بازسازی", PARTIAL: "بازسازی جزئی", FULL: "بازسازی کامل" },
  occupancyStatus: { VACANT: "خالی", OWNER_OCCUPIED: "مالک ساکن است", TENANT_OCCUPIED: "مستأجر دارد" },
  role: { CUSTOMER: "مشتری", OWNER: "مالک", AGENT: "مشاور", HASHTI: "کارمند هشتی" },
  verificationStatus: { PENDING: "در انتظار بررسی", VERIFIED: "تأییدشده", REJECTED: "ردشده" },
  entityType: { property: "ملک", owner: "مالک", request: "درخواست", customer: "مشتری" },
};

function formatScalar(value: string | number | boolean, fieldKey: string): string {
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number") return value.toLocaleString("fa-IR");
  return enumLabels[fieldKey]?.[value] ?? value;
}

function FormField({ fieldKey, label, value }: { fieldKey: string; label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) {
    const values = value.filter((item): item is string | number | boolean =>
      ["string", "number", "boolean"].includes(typeof item)
    );
    if (!values.length) return null;
    return <div className="min-w-0 rounded-lg bg-slate-50 p-3 sm:col-span-2">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{values.map((item) => formatScalar(item, fieldKey)).join("، ")}</dd>
    </div>;
  }
  if (typeof value === "object") return null;
  return <div className="min-w-0 rounded-lg bg-slate-50 p-3">
    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-sm text-slate-800">{formatScalar(value as string | number | boolean, fieldKey)}</dd>
  </div>;
}

type DisplayField = { key: string; label: string; value: unknown };

function collectFormFields(record: Record<string, unknown>): DisplayField[] {
  const fields: DisplayField[] = [];
  const append = (source: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(source)) {
      if (formFieldKeys.has(key) && !hiddenField.test(key)) {
        const customerRegistrantLabels: Record<string, string> = {
          registrantFirstName: "نام مشتری ثبت‌کننده",
          registrantLastName: "نام خانوادگی مشتری ثبت‌کننده",
          registrantMobile: "شماره تماس مشتری ثبت‌کننده",
        };
        const label = record.createdByRole === "CUSTOMER"
          ? customerRegistrantLabels[key] ?? formFieldLabels[key]
          : formFieldLabels[key];
        fields.push({ key, label, value });
      }
    }
  };

  append(record);

  // Management APIs may wrap a property in a relation object. Only traverse
  // these known, non-identity containers; never recursively expose arbitrary
  // user/session/audit relations in a shared component.
  for (const container of ["property", "listing", "agent", "owner", "customer"] as const) {
    const nested = record[container];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      append(nested as Record<string, unknown>);
      if (container === "property") {
        const listing = (nested as Record<string, unknown>).listing;
        if (listing && typeof listing === "object" && !Array.isArray(listing)) {
          append(listing as Record<string, unknown>);
        }
      }
    }
  }

  // شماره ثبت‌کننده ملک‌های مشاورمحور در API مدیریت مشاور با نام creatorMobile برمی‌گردد.
  if (record.registrationSource === "AGENT" && record.creatorMobile &&
      !fields.some((field) => field.key === "registrantMobile")) {
    fields.push({ key: "registrantMobile", label: formFieldLabels.registrantMobile, value: record.creatorMobile });
  }

  // روابط مالک و مشاور فقط پس از پالایش دسترسی در API به این بخش می‌رسند.
  const sources = [record, record.property].filter(
    (item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))
  );
  for (const source of sources) {
    const owners = source.owners;
    if (Array.isArray(owners) && !fields.some((field) => field.key === "ownerFirstName" && field.value !== null && field.value !== undefined && field.value !== "")) {
      for (const relation of owners) {
        if (!relation || typeof relation !== "object") continue;
        const owner = (relation as Record<string, unknown>).owner;
        if (!owner || typeof owner !== "object") continue;
        const profile = owner as Record<string, unknown>;
        if (profile.firstName && !fields.some((field) => field.key === "ownerFirstName" && field.value)) fields.push({ key: "ownerFirstName", label: formFieldLabels.ownerFirstName, value: profile.firstName });
        if (profile.lastName && !fields.some((field) => field.key === "ownerLastName" && field.value)) fields.push({ key: "ownerLastName", label: formFieldLabels.ownerLastName, value: profile.lastName });
        const mobile = profile.mobile ?? (profile.user && typeof profile.user === "object" ? (profile.user as Record<string, unknown>).mobile : null);
        if (mobile && !fields.some((field) => field.key === "ownerMobile" && field.value)) fields.push({ key: "ownerMobile", label: formFieldLabels.ownerMobile, value: mobile });
      }
    }
    const agents = source.agents;
    if (Array.isArray(agents) && !fields.some((field) => field.key === "approvedAgentFirstName" && field.value !== null && field.value !== undefined && field.value !== "")) {
      for (const relation of agents) {
        if (!relation || typeof relation !== "object") continue;
        const item = relation as Record<string, unknown>;
        if (item.status !== "ACTIVE" || item.approvedByOwner !== true) continue;
        const agent = item.agent;
        if (!agent || typeof agent !== "object") continue;
        const profile = agent as Record<string, unknown>;
        if (profile.firstName) fields.push({ key: "approvedAgentFirstName", label: formFieldLabels.approvedAgentFirstName, value: profile.firstName });
        if (profile.lastName) fields.push({ key: "approvedAgentLastName", label: formFieldLabels.approvedAgentLastName, value: profile.lastName });
        const mobile = profile.mobile ?? (profile.user && typeof profile.user === "object" ? (profile.user as Record<string, unknown>).mobile : null);
        if (mobile) fields.push({ key: "approvedAgentMobile", label: formFieldLabels.approvedAgentMobile, value: mobile });
        break;
      }
    }
  }

  return fields;
}

function findCoordinates(value: unknown, depth = 0): { latitude: number; longitude: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 4) return null;
  const data = value as Record<string, unknown>;
  const latitudeValue = data.latitudeExact ?? data.latitude ?? data.lat;
  const longitudeValue = data.longitudeExact ?? data.longitude ?? data.lng ?? data.lon;
  const latitude = typeof latitudeValue === "number" ? latitudeValue : Number(latitudeValue);
  const longitude = typeof longitudeValue === "number" ? longitudeValue : Number(longitudeValue);
  if (latitudeValue !== null && latitudeValue !== undefined && longitudeValue !== null && longitudeValue !== undefined &&
      Number.isFinite(latitude) && Number.isFinite(longitude) &&
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 &&
      (latitude !== 0 || longitude !== 0)) {
    return { latitude, longitude };
  }
  for (const child of Object.values(data)) {
    const found = findCoordinates(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function FormDetails({ record }: { record: unknown }) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm">اطلاعات فرم برای نمایش وجود ندارد.</p>;
  }

  const data = record as Record<string, unknown>;
  const coordinates = findCoordinates(data);
  const fields = collectFormFields(data);

  if (!fields.length) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">فیلد ثبت‌شده‌ای از فرم ایجاد این مورد برای نمایش وجود ندارد.</p>;
  }

  return <div className="space-y-4">
    {coordinates && <RecordLocationMap latitude={coordinates.latitude} longitude={coordinates.longitude} label="موقعیت رکورد" />}
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(({ key, label, value }, index) => <FormField key={key + "-" + index} fieldKey={key} label={label} value={value} />)}
    </dl>
  </div>;
}

/** ردیف قابل کلیک جدول؛ فقط فیلدهای شناخته‌شده فرم از داده مجاز همان پنل نمایش داده می‌شوند. */
export function RecordDetailsRow({ record, title = "رکورد", className = "", children }: RecordDetailsRowProps) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  const openFromRow = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,select,textarea,[role='button'],[data-record-details-ignore='true']")) return;
    setOpen(true);
  };

  return <>
    <tr
      className={`${className} cursor-pointer transition-colors hover:bg-blue-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500`}
      onClick={openFromRow}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setOpen(true);
        }
      }}
      tabIndex={0}
      aria-label={`نمایش جزئیات ${title}`}
    >
      {children}
    </tr>
    {mounted && open && createPortal(
      <Modal open title={`جزئیات ${title}`} description="اطلاعات فرم ثبت و ویرایش موجود برای این رکورد" onClose={() => setOpen(false)} size="full">
        <FormDetails record={record} />
      </Modal>,
      document.body
    )}
  </>;
}
