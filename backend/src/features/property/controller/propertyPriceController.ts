/**
 * ============================================================
 * Property Price Controller
 * ============================================================
 *
 * مسئول دریافت HTTP Request و ارسال HTTP Response مربوط
 * به تغییر قیمت ملک است.
 *
 * ساختار:
 *
 * HTTP Request
 *      ↓
 * Controller
 *      ↓
 * Property Price Service
 *      ↓
 * Repository
 *      ↓
 * Database
 *
 * این Controller هیچ منطق Business مربوط به قیمت ندارد.
 *
 * ============================================================
 */

import { Request, Response } from "express";

import {
  updatePropertyPrice,
} from "../service/propertyPriceService";

/**
 * ============================================================
 * تغییر قیمت ملک
 * ============================================================
 *
 * PUT /properties/:id/price
 *
 * شناسه ملک از URL دریافت می‌شود:
 *
 * /properties/test-price-001/price
 *
 * اطلاعات قیمت از Body دریافت می‌شوند.
 */
export async function updatePropertyPriceController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const result = await updatePropertyPrice(
      propertyId,
      req.body
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      message:
        error.message ||
        "خطا در تغییر قیمت ملک",
    });
  }
}