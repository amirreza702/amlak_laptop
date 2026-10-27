/**
 * ============================================================
 * پوسته استاتیک صفحه جزئیات ملک
 * ============================================================
 *
 * Build به اطلاعات ملک‌ها وابسته نیست. فقط یک فایل fallback
 * ساخته می‌شود و اطلاعات واقعی با CSR در مرورگر بارگیری می‌شوند.
 */
import PropertyDetailClient from "./PropertyDetailClient";

/**
 * خروجی استاتیک Next.js برای مسیر پویا به یک پارامتر نیاز دارد.
 * این شناسه فقط فایل fallback است و شناسه واقعی هیچ ملکی نیست.
 */
export function generateStaticParams() {
  return [{ id: "__csr__" }];
}

export default function PropertyPage() {
  return <PropertyDetailClient />;
}
