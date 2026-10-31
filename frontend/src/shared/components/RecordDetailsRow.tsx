"use client";

import { useState, useSyncExternalStore, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/shared/components/Modal";
import dynamic from "next/dynamic";

const RecordLocationMap = dynamic(() => import("@/shared/components/RecordLocationMap"), { ssr: false });

// Hydration-aware client flag without synchronously setting state inside an effect.
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
  firstName: "نام", lastName: "نام خانوادگی", mobile: "شماره موبایل",
  propertyId: "شناسه ملک", ownerId: "شناسه مالک", agentId: "شناسه مشاور",
  userId: "شناسه کاربر", customerId: "شناسه مشتری", requestId: "شناسه درخواست", role: "نقش",
  agencyName: "نام آژانس", address: "نشانی", city: "شهر", district: "محله / منطقه",
  postalCode: "کد پستی", propertyType: "نوع ملک", transactionType: "نوع معامله",
  description: "توضیحات", notes: "یادداشت", reason: "دلیل",
  area: "متراژ", rooms: "تعداد اتاق", floor: "طبقه",
  latitude: "عرض جغرافیایی", longitude: "طول جغرافیایی",
  latitudeExact: "عرض جغرافیایی", longitudeExact: "طول جغرافیایی",
  salePrice: "قیمت فروش", depositAmount: "مبلغ رهن", rentAmount: "مبلغ اجاره",
  share: "سهم مالکیت", isPrimary: "مالک اصلی",
  budget: "بودجه", minBudget: "حداقل بودجه", maxBudget: "حداکثر بودجه",
  minArea: "حداقل متراژ", maxArea: "حداکثر متراژ",
  minRooms: "حداقل اتاق", maxRooms: "حداکثر اتاق",
  entityType: "نوع مورد", entityId: "شناسه مورد", note: "یادداشت",
  amenities: "امکانات", features: "ویژگی‌ها", propertyAge: "سن بنا",
  buildingAge: "سن بنا", parking: "پارکینگ", elevator: "آسانسور",
  storage: "انباری", balcony: "بالکن", unit: "واحد",
  adminPermissions: "مجوزهای دسترسی",
};

const formFieldKeys = new Set(Object.keys(formFieldLabels));
const hiddenField = /(password|passwordhash|token|secret|authorization|cookie|credential)/i;

function formatScalar(value: string | number | boolean, label: string): string {
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number") return value.toLocaleString("fa-IR");
  return value;
}

function FormField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) {
    const values = value.filter((item): item is string | number | boolean =>
      ["string", "number", "boolean"].includes(typeof item)
    );
    if (!values.length) return null;
    return <div className="min-w-0 rounded-lg bg-slate-50 p-3 sm:col-span-2">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{values.map((item) => formatScalar(item, label)).join("، ")}</dd>
    </div>;
  }
  if (typeof value === "object") return null;
  return <div className="min-w-0 rounded-lg bg-slate-50 p-3">
    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-sm text-slate-800">{formatScalar(value as string | number | boolean, label)}</dd>
  </div>;
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

  const coordinates = findCoordinates(record);
  const fields = Object.entries(record as Record<string, unknown>)
    .filter(([key]) => formFieldKeys.has(key) && !hiddenField.test(key));

  if (!fields.length) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">فیلد ثبت‌شده‌ای از فرم ایجاد این مورد برای نمایش وجود ندارد.</p>;
  }

  return <div className="space-y-4">
    {coordinates && <RecordLocationMap latitude={coordinates.latitude} longitude={coordinates.longitude} label="موقعیت رکورد" />}
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, value]) => <FormField key={key} label={formFieldLabels[key] ?? key} value={value} />)}
    </dl>
  </div>;
}

/** ردیف قابل کلیک جدول؛ مدال فقط فیلدهای ورودی فرم همان رکورد را نشان می‌دهد. */
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
      <Modal open title={`جزئیات ${title}`} description="فقط اطلاعات واردشده در فرم ایجاد این مورد" onClose={() => setOpen(false)} size="full">
        <FormDetails record={record} />
      </Modal>,
      document.body
    )}
  </>;
}
