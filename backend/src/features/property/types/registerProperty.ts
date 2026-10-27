/**
 * ============================================================
 * Register Property Input
 * ============================================================
 *
 * Type ورودی Use Case ثبت ملک توسط مالک یا مشاور.
 *
 * این فایل نباید مستقیماً به Prisma وابسته باشد.
 * ============================================================
 */

export type PropertyType =
  | "APARTMENT"
  | "HOUSE"
  | "VILLA"
  | "LAND"
  | "SHOP"
  | "OFFICE"
  | "GARDEN";

/**
 * اطلاعات مشترک موردنیاز برای ثبت ملک توسط مالک یا مشاور
 */
export interface RegisterPropertyInput {
  /**
   * نوع ملک
   */
  propertyType: PropertyType;

  /**
   * اطلاعات مکانی
   */
  city: string;
  district: string;
  address: string;

  /**
   * کد پستی اختیاری است.
   */
  postalCode?: string | null;

  /**
   * مختصات دقیق ملک
   *
   * برای ثبت ملک اجباری است.
   *
   * کاربر در UI مختصات را دستی وارد نمی‌کند؛
   * نقطه ملک روی نقشه انتخاب می‌شود.
   */
  latitudeExact: number;
  longitudeExact: number;

  /**
   * مشخصات ملک
   */
  area?: number | null;
  rooms?: number | null;
  floor?: number | null;

  /**
   * شناسه پروفایل ثبت‌کننده؛ فقط یکی از این دو مقدار تعیین می‌شود.
   * مقدار معتبر از نشست احراز هویت‌شده در Route تزریق می‌شود.
   */
  agentId?: string;
  ownerId?: string;
}