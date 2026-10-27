/**
 * ============================================================
 * Property Listing Status Controller
 * ============================================================
 *
 * مسئول دریافت HTTP Request و ارسال HTTP Response
 * مربوط به تغییر وضعیت PropertyListing است.
 *
 * ساختار:
 *
 * HTTP Request
 *      ↓
 * Controller
 *      ↓
 * Property Listing Status Service
 *      ↓
 * Repository
 *      ↓
 * Database
 *
 * این Controller هیچ منطق Business مربوط به
 * Transition وضعیت‌ها ندارد.
 *
 * ============================================================
 */

import { Request, Response } from "express";

import {
  updatePropertyListingStatus,
} from "../service/propertyListingStatusService";

/**
 * ============================================================
 * تغییر وضعیت PropertyListing
 * ============================================================
 *
 * PUT /properties/:id/status
 *
 * شناسه Property از URL دریافت می‌شود.
 *
 * وضعیت جدید از Body دریافت می‌شود.
 */
export async function updatePropertyListingStatusController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    /**
     * --------------------------------------------------------
     * دریافت Property ID
     * --------------------------------------------------------
     */
    const propertyId = req.params.id;

    /**
     * --------------------------------------------------------
     * ارسال درخواست به Service
     * --------------------------------------------------------
     */
    const result =
      await updatePropertyListingStatus(
        propertyId,
        req.body
      );

    /**
     * --------------------------------------------------------
     * پاسخ موفق
     * --------------------------------------------------------
     */
    res.status(200).json(result);
  } catch (error: any) {
    /**
     * --------------------------------------------------------
     * خطا
     * --------------------------------------------------------
     */
    res.status(400).json({
      message:
        error.message ||
        "خطا در تغییر وضعیت ملک",
    });
  }
}