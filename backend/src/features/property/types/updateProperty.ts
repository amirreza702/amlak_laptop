import type { PropertyType } from "@prisma/client";

export interface UpdatePropertyInput {
  propertyType?: PropertyType;

  city?: string;

  district?: string;

  address?: string;

  postalCode?: string | null;

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
}