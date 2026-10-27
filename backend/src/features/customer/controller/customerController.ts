/**
 * ============================================================
 * Customer Controller
 * ============================================================
 *
 * این Controller فقط مسئول ارتباط HTTP است.
 *
 * جریان:
 *
 * HTTP Request
 *      ↓
 * Controller
 *      ↓
 * Service
 *
 * منطق Business در Service قرار دارد.
 * عملیات Database در Repository انجام می‌شود.
 *
 * ============================================================
 */

import { Request, Response } from "express";

import {
  getCustomerProfile,
  updateCustomerProfileService,
} from "../service/customerService";

/**
 * ============================================================
 * دریافت Profile مشتری
 * ============================================================
 *
 * GET /customers/:customerId/profile
 */
export async function getCustomerProfileController(
  req: Request<{ customerId: string }>,
  res: Response
) {
  try {
    const result = await getCustomerProfile(
      req.params.customerId
    );

    return res.status(200).json(result);
  } catch (error: any) {
    /**
     * Customer وجود ندارد.
     */
    if (error.message === "Customer not found") {
      return res.status(404).json({
        message: error.message,
      });
    }

    /**
     * خطای پیش‌بینی‌نشده.
     */
    console.error(
      "Error getting customer profile:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * ============================================================
 * ویرایش Profile مشتری
 * ============================================================
 *
 * PUT /customers/:customerId/profile
 */
export async function updateCustomerProfileController(
  req: Request<{ customerId: string }>,
  res: Response
) {
  try {
    const result =
      await updateCustomerProfileService(
        req.params.customerId,
        req.body
      );

    return res.status(200).json(result);
  } catch (error: any) {
    /**
     * Customer وجود ندارد.
     */
    if (error.message === "Customer not found") {
      return res.status(404).json({
        message: error.message,
      });
    }

    /**
     * نام خالی ارسال شده است.
     */
    if (
      error.message ===
      "First name cannot be empty"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Last name cannot be empty"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    /**
     * هیچ فیلدی برای تغییر ارسال نشده است.
     */
    if (
      error.message ===
      "No profile fields to update"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    /**
     * خطای پیش‌بینی‌نشده.
     */
    console.error(
      "Error updating customer profile:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}