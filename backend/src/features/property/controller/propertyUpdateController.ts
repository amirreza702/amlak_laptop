import type { Request, Response } from "express";

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
    const data =
      req.body as UpdatePropertyInput;

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
    res.status(200).json({
      property: updatedProperty,
    });
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