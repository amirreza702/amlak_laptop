"use client";

import { useEffect, useState, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/shared/components/Modal";

type RecordDetailsRowProps = {
  record: unknown;
  title?: string;
  className?: string;
  children: ReactNode;
};

const fieldLabels: Record<string, string> = {
  id: "شناسه", propertyId: "شناسه ملک", ownerId: "شناسه مالک", agentId: "شناسه مشاور",
  userId: "شناسه کاربر", mobile: "شماره موبایل", firstName: "نام", lastName: "نام خانوادگی",
  agencyName: "نام آژانس", address: "نشانی", city: "شهر", district: "محله / منطقه",
  postalCode: "کد پستی", propertyType: "نوع ملک", transactionType: "نوع معامله",
  listingStatus: "وضعیت آگهی", status: "وضعیت", isActive: "فعال", isVerified: "تأییدشده",
  approvedByOwner: "تأیید مالک", approvedAt: "زمان تأیید", createdAt: "زمان ایجاد",
  updatedAt: "آخرین به‌روزرسانی", registeredAt: "زمان ثبت", reviewedAt: "زمان بررسی",
  publishedAt: "زمان انتشار", confirmUntil: "مهلت تأیید", description: "توضیحات",
  notes: "یادداشت", reason: "دلیل", role: "نقش", createdByRole: "نقش ایجادکننده",
  createdByUserId: "شناسه ایجادکننده", registrationSource: "منبع ثبت",
  area: "متراژ", rooms: "تعداد اتاق", floor: "طبقه", latitudeExact: "عرض جغرافیایی",
  longitudeExact: "طول جغرافیایی", salePrice: "قیمت فروش", depositAmount: "مبلغ رهن",
  rentAmount: "مبلغ اجاره", share: "سهم مالکیت", isPrimary: "مالک اصلی",
  verificationStatus: "وضعیت احراز", isFirstRegistrant: "ثبت‌کننده نخست",
  canManage: "اجازه مدیریت", operation: "عملیات", targetType: "نوع هدف",
  targetId: "شناسه هدف", actor: "عامل عملیات", before: "مقدار قبلی", after: "مقدار جدید",
  property: "ملک", owner: "مالک", agent: "مشاور", user: "کاربر", listing: "اطلاعات آگهی",
  owners: "مالکان", agents: "مشاوران", responses: "پاسخ‌ها", verificationCases: "پرونده‌های تأیید",
  evaluations: "ارزیابی‌ها", properties: "املاک", createdBy: "ایجادکننده",
};

const hiddenField = /(password|passwordhash|token|secret|authorization|cookie|credential)/i;

function formatScalar(value: string | number | boolean, label: string): string {
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number") return value.toLocaleString("fa-IR");
  if (/(زمان|تاریخ|مهلت)/.test(label)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("fa-IR");
  }
  return value;
}

function DetailValue({ label, value, depth = 0 }: { label: string; value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === "") {
    return <div className="min-w-0 rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-700">—</dd></div>;
  }

  if (Array.isArray(value)) {
    return <section className="space-y-2 rounded-xl border border-slate-200 p-3 sm:col-span-2">
      <h3 className="text-sm font-bold text-slate-800">{label} <span className="text-xs font-normal text-slate-500">({value.length.toLocaleString("fa-IR")} مورد)</span></h3>
      {value.length === 0 ? <p className="text-sm text-slate-500">موردی ثبت نشده است.</p> : <div className="grid gap-2 sm:grid-cols-2">
        {value.map((item, index) => <DetailValue key={index} label={`مورد ${(index + 1).toLocaleString("fa-IR")}`} value={item} depth={depth + 1} />)}
      </div>}
    </section>;
  }

  if (typeof value === "object") {
    if (depth >= 6) return <div className="min-w-0 rounded-lg bg-slate-50 p-3 sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd dir="ltr" className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 2)}</dd></div>;
    const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => !hiddenField.test(key));
    return <section className="space-y-2 rounded-xl border border-slate-200 p-3 sm:col-span-2">
      <h3 className="text-sm font-bold text-slate-800">{label}</h3>
      {entries.length === 0 ? <p className="text-sm text-slate-500">اطلاعاتی برای نمایش وجود ندارد.</p> : <dl className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, child]) => <DetailValue key={key} label={fieldLabels[key] ?? key} value={child} depth={depth + 1} />)}
      </dl>}
    </section>;
  }

  return <div className="min-w-0 rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-800">{formatScalar(value as string | number | boolean, label)}</dd></div>;
}

/** ردیف قابل کلیک جدول که تمام داده‌های دریافتی همان رکورد را در مدال نمایش می‌دهد. */
export function RecordDetailsRow({ record, title = "رکورد", className = "", children }: RecordDetailsRowProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
      <Modal open title={`جزئیات ${title}`} description="اطلاعات کامل رکورد موجود در سامانه" onClose={() => setOpen(false)} size="full">
        {record && typeof record === "object"
          ? <dl className="grid gap-3 sm:grid-cols-2"><DetailValue label={title} value={record} /></dl>
          : <p className="rounded-lg bg-slate-50 p-4 text-sm">{String(record ?? "اطلاعاتی برای نمایش وجود ندارد.")}</p>}
      </Modal>,
      document.body
    )}
  </>;
}
