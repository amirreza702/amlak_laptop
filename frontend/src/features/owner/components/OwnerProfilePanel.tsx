"use client";

import type { FormEvent } from "react";
import { LoaderCircle, Save, UserRound } from "lucide-react";
import type { OwnerProfile } from "../api/ownerApi";

interface OwnerProfilePanelProps {
  profile: OwnerProfile | null;
  mobile: string;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function OwnerProfilePanel({
  profile,
  mobile,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  loading,
  saving,
  error,
  message,
  onSubmit,
}: OwnerProfilePanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-[#043873]" />
        <h2 className="text-lg font-bold">اطلاعات مالک</h2>
      </div>
      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت پروفایل...
        </p>
      ) : profile ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm text-slate-600">
            شماره موبایل: <span dir="ltr" className="font-semibold">{profile.user?.mobile ?? mobile}</span>
          </p>
          <label className="space-y-1 text-sm font-medium">
            نام
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
          </label>
          <label className="space-y-1 text-sm font-medium">
            نام خانوادگی
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیرهٔ پروفایل
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          {error || "پروفایل در دسترس نیست."}
        </div>
      )}
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && profile && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
