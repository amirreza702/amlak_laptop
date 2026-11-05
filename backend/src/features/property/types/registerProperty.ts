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

/** نقش ثبت‌کننده که فقط از سشن احراز هویت‌شده می‌آید. */
export type PropertyCreatorRole = "OWNER" | "AGENT";

/** هویت ثبت‌کننده که از سشن استخراج می‌شود، نه از body ارسالی کاربر. */
export interface PropertyCreator {
  id: string;
  mobile: string;
  role: PropertyCreatorRole;
  isActive: boolean;
}

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
  yearBuilt?: number | null;
  unitNumber?: string | null;
  totalUnits?: number | null;
  parkingCount?: number | null;
  parkingType?: string | null;
  parkingNumber?: string | null;
  hasElevator?: boolean | null;
  hasStorage?: boolean | null;
  hasBalcony?: boolean | null;
  hasYard?: boolean | null;
  heatingSystem?: string | null;
  coolingSystem?: string | null;
  documentType?: "SINGLE_SHEET" | "OLD_DEED" | "OFFICIAL_CONTRACT" | "ORDINARY_CONTRACT" | null;
  ownershipType?: "SIX_DANG" | "SHARED" | null;
  landTenure?: "FREEHOLD" | "ENDOWMENT" | null;
  description?: string | null;
  renovationStatus?: "NO_RENOVATION" | "PARTIAL" | "FULL" | null;
  renovationYear?: number | null;
  occupancyStatus?: "VACANT" | "OWNER_OCCUPIED" | "TENANT_OCCUPIED";

  /** اطلاعات هویتی مالک؛ در ثبت ملک توسط مشاور الزامی و خصوصی است. */
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  /** شماره همراه واقعی مالک؛ برای ثبت مشاور الزامی است. */
  ownerMobile?: string | null;

  /**
   * شناسه پروفایل ثبت‌کننده؛ فقط یکی از این دو مقدار تعیین می‌شود.
   * مقدار معتبر از نشست احراز هویت‌شده در Route تزریق می‌شود.
   */
  agentId?: string;
  ownerId?: string;
}