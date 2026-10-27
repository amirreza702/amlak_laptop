/**
 * ============================================================
 * Property Listing Controller
 * ============================================================
 *
 * مسئول دریافت HTTP Request و ارسال نتیجه HTTP Response است.
 *
 * این Controller هیچ منطق Business مربوط به قیمت ندارد.
 *
 * ساختار:
 *
 * HTTP Request
 *      ↓
 * Controller
 *      ↓
 * Service
 *      ↓
 * Repository
 *      ↓
 * Database
 *
 * ============================================================
 */

import { Request, Response } from "express";

import {
  createPropertyListingWithInitialPrice,
} from "../service/propertyListingService";

/**
 * ============================================================
 * ثبت اولین Listing و قیمت ملک
 * ============================================================
 *
 * POST /properties/:id/listing
 */
export async function createPropertyListingController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    /**
     * شناسه Property از URL دریافت می‌شود.
     */
    const propertyId = req.params.id;

    /**
     * اطلاعات معامله و قیمت از Body دریافت می‌شوند.
     */
    const result =
      await createPropertyListingWithInitialPrice(
        propertyId,
        req.body
      );

    /**
     * Listing با موفقیت ایجاد شد.
     */
    res.status(201).json(result);
  } catch (error: any) {
    /**
     * خطاهای Business فعلاً با 400 برگردانده می‌شوند.
     */
    res.status(400).json({
      message:
        error.message ||
        "خطا در ثبت اطلاعات معامله و قیمت ملک",
    });
  }
}