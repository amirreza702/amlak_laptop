"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, UserRoundPlus } from "lucide-react";
import { agentApiRequest } from "../api/agentApi";
type CustomerRequestTransactionType = "SALE" | "FULL_DEPOSIT" | "RENT" | "DEPOSIT_AND_RENT";
type CustomerRequestPropertyType = "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";

const inputClassName = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#043873] focus:ring-2 focus:ring-[#043873]/10";

const transactionOptions: Array<{ value: CustomerRequestTransactionType; label: string }> = [
  { value: "SALE", label: "خرید" },
  { value: "FULL_DEPOSIT", label: "رهن کامل" },
  { value: "RENT", label: "اجاره" },
  { value: "DEPOSIT_AND_RENT", label: "رهن و اجاره" },
];
const propertyOptions: Array<{ value: CustomerRequestPropertyType; label: string }> = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "SHOP", label: "مغازه" },
  { value: "OFFICE", label: "اداری" },
  { value: "GARDEN", label: "باغ" },
];

interface CreatedRequest {
  id: string;
  status: string;
  createdAt: string;
  createdByRole: "AGENT" | "CUSTOMER";
}

export function AgentCreateSearchRequestPanel({ onCreated }: { onCreated?: () => void }) {
  const [transactionType, setTransactionType] = useState<CustomerRequestTransactionType>("SALE");
  const [propertyType, setPropertyType] = useState<CustomerRequestPropertyType>("APARTMENT");
  const [requesterFirstName, setRequesterFirstName] = useState("");
  const [requesterLastName, setRequesterLastName] = useState("");
  const [requesterMobile, setRequesterMobile] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRequest | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedFirstName = requesterFirstName.trim();
    const normalizedLastName = requesterLastName.trim();
    const normalizedMobile = requesterMobile.trim();
    const normalizedCity = city.trim();
    if (!normalizedLastName || !normalizedMobile) { setError("نام خانوادگی و شماره تماس مشتری الزامی است."); return; }
    if (!normalizedCity) {
      setError("شهر موردنظر را وارد کنید.");
      return;
    }
    if (!budget.trim()) {
      setError("وارد کردن بودجه الزامی است.");
      return;
    }
    const numericBudget = Number(budget);
    if (!Number.isFinite(numericBudget) || numericBudget < 0) {
      setError("بودجه باید عددی معتبر و صفر یا بیشتر باشد.");
      return;
    }

    setBusy(true);
    try {
      const result = await agentApiRequest<CreatedRequest>("/agents/me/search-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterFirstName: normalizedFirstName,
          requesterLastName: normalizedLastName,
          requesterMobile: normalizedMobile,
          transactionType,
          propertyType,
          city: normalizedCity,
          budget: numericBudget,
          ...(description.trim() ? { description: description.trim() } : {}),
        }),
      });
      setCreated(result);
      onCreated?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message === "Budget is required"
          ? "وارد کردن بودجه الزامی است."
          : message || "ثبت درخواست انجام نشد."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#043873]">
          <UserRoundPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">ثبت درخواست مشتری</h2>
          <p className="mt-1 text-sm leading-7 text-slate-600">
            مشخصات مشتری و نیاز ملکی او را ثبت کنید. شماره تماس واردشده متعلق به مشتری است.
          </p>
        </div>
      </div>

      {created ? (
        <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
          <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5" /> درخواست با موفقیت ثبت شد.</div>
          <p className="mt-2">ثبت‌کننده: مشاور املاک (حساب جاری)</p>
          <p>نام و شماره تماس مشتری در درخواست ذخیره شد.</p>
          <p className="mt-2">کد پیگیری: <span dir="ltr" className="select-all font-mono">{created.id}</span></p>
          <button type="button" onClick={() => { setCreated(null); setRequesterFirstName(""); setRequesterLastName(""); setRequesterMobile(""); setCity(""); setBudget(""); setDescription(""); }} className="mt-3 rounded-lg bg-[#043873] px-4 py-2 font-bold text-white">ثبت درخواست دیگر</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-medium">نام مشتری
              <input className={inputClassName} value={requesterFirstName} onChange={e => setRequesterFirstName(e.target.value)} maxLength={80} />
            </label>
            <label className="space-y-2 text-sm font-medium">نام خانوادگی مشتری *
              <input className={inputClassName} value={requesterLastName} onChange={e => setRequesterLastName(e.target.value)} required maxLength={100} />
            </label>
            <label className="space-y-2 text-sm font-medium">شماره تماس مشتری *
              <input className={inputClassName} type="tel" inputMode="tel" value={requesterMobile} onChange={e => setRequesterMobile(e.target.value)} required />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">نوع معامله
              <select className={inputClassName} value={transactionType} onChange={e => setTransactionType(e.target.value as CustomerRequestTransactionType)}>
                {transactionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">نوع ملک
              <select className={inputClassName} value={propertyType} onChange={e => setPropertyType(e.target.value as CustomerRequestPropertyType)}>
                {propertyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">شهر موردنظر *
              <input className={inputClassName} value={city} onChange={e => setCity(e.target.value)} placeholder="مثلاً شاهرود" required />
            </label>
            <label className="space-y-2 text-sm font-medium">بودجه تقریبی (تومان) *
              <input className={inputClassName} type="number" min="0" step="any" required value={budget} onChange={e => setBudget(e.target.value)} placeholder="مبلغ را به تومان وارد کنید" />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium">توضیحات تکمیلی
            <textarea className={inputClassName + " min-h-28 resize-y"} value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="محله و ویژگی‌های موردنیاز مشتری..." />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy ? "در حال ثبت..." : "ثبت درخواست"}
          </button>
        </form>
      )}
    </section>
  );
}
