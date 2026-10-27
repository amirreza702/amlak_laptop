import { findPublishedPublicPropertyById } from "../repository/publicPropertyRepository";

/**
 * دریافت اطلاعات قابل نمایش عمومی یک آگهی.
 *
 * آگهی حذف‌شده، منقضی یا منتشرنشده در دسترس عمومی نیست.
 */
export async function getPublishedPublicPropertyById(id: string) {
  const property = await findPublishedPublicPropertyById(id);

  if (!property) {
    throw new Error("آگهی عمومی موردنظر پیدا نشد.");
  }

  return property;
}
