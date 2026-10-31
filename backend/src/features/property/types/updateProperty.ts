import type { PropertyType } from "@prisma/client";

export interface UpdatePropertyInput {
  propertyType?: PropertyType;

  city?: string;

  district?: string;

  address?: string;

  postalCode?: string | null;

  /** نام و نام خانوادگی مالک؛ فقط مشاور ثبت‌کننده و هشتی مجاز به ویرایش هستند. */
  ownerFirstName?: string;
  ownerLastName?: string;
  /** شماره تماس مالک؛ فقط مشاور ثبت‌کننده و هشتی می‌توانند آن را تغییر دهند. */
  ownerMobile?: string;

  /**
   * مختصات دقیق ملک.
   *
   * در دیتابیس اجباری و غیر Nullable است،
   * بنابراین در هنگام ویرایش نیز اگر ارسال شود
   * باید حتماً عدد معتبر باشد.
   */
  latitudeExact?: number;

  longitudeExact?: number;

  /**
   * مختصات عمومی می‌تواند Nullable باشد،
   * چون ممکن است هنوز برای نمایش عمومی تعیین نشده باشد.
   */
  latitudePublic?: number | null;

  longitudePublic?: number | null;

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
}