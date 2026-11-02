import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  updatePropertyService,
} from "../service/propertyService";

import type { UpdatePropertyInput } from "../types/updateProperty";

/**
 * ============================================================
 * Update Property Controller
 * ============================================================
 *
 * مسئول دریافت درخواست HTTP و ارسال آن
 * به Service مربوط به Update Property است.
 */
export async function updatePropertyController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    /**
     * شناسه ملک از پارامتر Route دریافت می‌شود.
     */
    const propertyId = String(req.params.id);

    /**
     * اطلاعات ویرایش‌شده از Body دریافت می‌شوند.
     */
    // فقط فیلدهای قابل ویرایش ملک پذیرفته می‌شوند؛
    // شناسه‌ها، وضعیت انتشار، تأییدها و فیلدهای مدیریتی از Body حذف می‌شوند.
    const user = (req as AuthenticatedRequest).user;
    const editableFields = [
      "propertyType", "city", "district", "address", "postalCode",
      ...(user?.role === "AGENT" || user?.role === "HASHTI" ? ["ownerMobile", "ownerFirstName", "ownerLastName"] : []),
      "latitudeExact", "longitudeExact", "latitudePublic", "longitudePublic",
      "area", "rooms", "floor", "yearBuilt", "unitNumber", "totalUnits",
      "parkingCount", "parkingType", "parkingNumber", "hasElevator",
      "hasStorage", "hasBalcony", "hasYard", "heatingSystem", "coolingSystem",
      "documentType", "ownershipType", "landTenure", "description",
      "renovationStatus", "renovationYear", "occupancyStatus",
    ] as const;
    const body = req.body as Record<string, unknown>;
    const data = Object.fromEntries(
      editableFields
        .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
        .map((field) => [field, body[field]])
    ) as UpdatePropertyInput;

    /**
     * اجرای Use Case
     */
    const updatedProperty =
      await updatePropertyService(
        propertyId,
        data
      );

    /**
     * پاسخ موفق
     */
    // مسیر ویرایش مشاور فقط برای ثبت‌کننده همان ملک مجاز است؛
    // مشخصات مالک در پاسخ نیز فقط به همان مشاور بازگردانده می‌شود.
    res.status(200).json({ property: updatedProperty });
  } catch (error) {
    /**
     * مدیریت خطای Business
     */
    const message =
      error instanceof Error
        ? error.message
        : "خطای ناشناخته.";

    res.status(400).json({
      message,
    });
  }
}