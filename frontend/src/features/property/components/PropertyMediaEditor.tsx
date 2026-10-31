"use client";

import { useEffect, useState } from "react";
import { compressPropertyImage } from "../utils/compressPropertyImage";
import { getPropertyMedia, getPropertyMediaPreview, uploadPropertyMedia } from "../api/propertyApi";

type MediaItem = { id: string; url: string; type: string; sortOrder: number; preview?: string };

export function PropertyMediaEditor({ propertyId, onError }: { propertyId: string; onError?: (message: string) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const media = await getPropertyMedia(propertyId);
        const withPreviews = await Promise.all(media.map(async (item) => ({
          ...item,
          preview: await getPropertyMediaPreview(propertyId, item.id).catch(() => ""),
        })));
        if (active) setItems(withPreviews);
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "دریافت تصاویر ناموفق بود.";
          setErrorMessage(message);
          onError?.(message);
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [propertyId, onError]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setMessage(""); setErrorMessage("");
    try {
      const allFiles = Array.from(files);
      const invalidFile = allFiles.find((file) => !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type));
      if (invalidFile) throw new Error("فقط تصویر با فرمت‌های JPG، PNG، WebP یا AVIF مجاز است.");
      const selectedFiles = allFiles.slice(0, Math.max(0, 20 - items.length));
      if (selectedFiles.length < files.length) {
        setMessage("حداکثر ۲۰ تصویر برای هر ملک قابل ثبت است؛ فقط تعداد مجاز انتخاب‌شده بارگذاری می‌شود.");
      }
      for (const [index, file] of selectedFiles.entries()) {
        const imageData = await compressPropertyImage(file);
        const created = await uploadPropertyMedia(propertyId, imageData, items.length + index);
        setItems((current) => [...current, { ...created, type: "IMAGE", sortOrder: current.length, preview: imageData }]);
      }
      if (selectedFiles.length === files.length) setMessage("تصاویر بهینه و ذخیره شدند.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "بارگذاری تصویر ناموفق بود.";
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true); setErrorMessage("");
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "/api";
      const response = await fetch(`${api}/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "حذف تصویر ناموفق بود.");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "حذف تصویر ناموفق بود.";
      setErrorMessage(message);
      onError?.(message);
    } finally { setBusy(false); }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true); setErrorMessage("");
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "/api";
      const response = await fetch(`${api}/properties/${encodeURIComponent(propertyId)}/media/order`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((item) => item.id) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "مرتب‌سازی تصاویر ناموفق بود.");
      setItems(next.map((item, sortOrder) => ({ ...item, sortOrder })));
    } catch (error) {
      const message = error instanceof Error ? error.message : "مرتب‌سازی تصاویر ناموفق بود.";
      setErrorMessage(message);
      onError?.(message);
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">تصاویر ملک</h3>
        <label className="cursor-pointer rounded-lg bg-[#043873] px-3 py-2 text-xs font-bold text-white">
          {busy ? "در حال پردازش..." : "بارگذاری تصویر"}
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy || items.length >= 20} onChange={(event) => { void addFiles(event.target.files); event.currentTarget.value = ""; }} className="hidden" />
        </label>
      </div>
      <p className="text-xs text-slate-500">فقط JPG، PNG، WebP و AVIF پذیرفته می‌شود؛ حداکثر ۲۰ تصویر. تصاویر پیش از ذخیره به WebP تبدیل می‌شوند.</p>
      {errorMessage && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{errorMessage}</p>}
      {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
      {items.length === 0 ? <p className="text-sm text-slate-500">هنوز تصویری برای این ملک ثبت نشده است.</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-lg border p-2">
              {item.preview ? <img src={item.preview} alt={`تصویر ملک ${index + 1}`} className="aspect-[4/3] w-full rounded-md object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">پیش‌نمایش در دسترس نیست</div>}
              <div className="flex flex-wrap justify-center gap-1">
                <button type="button" disabled={busy || index === 0} onClick={() => void move(index, -1)} className="rounded border px-2 py-1 text-xs">←</button>
                <button type="button" disabled={busy || index === items.length - 1} onClick={() => void move(index, 1)} className="rounded border px-2 py-1 text-xs">→</button>
                <button type="button" disabled={busy} onClick={() => void remove(item.id)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
