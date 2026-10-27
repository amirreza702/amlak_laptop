/**
 * ============================================================
 * Contact Access Controller
 * ============================================================
 *
 * مسئول دریافت درخواست HTTP و ارسال پاسخ مناسب است.
 *
 * منطق کسب‌وکار در ContactAccessService قرار دارد.
 */

import { Request, Response } from "express";

import {
  accessCustomerContact,
} from "../service/contactAccessService";

/**
 * دسترسی Agent به اطلاعات تماس Customer
 */
export const accessCustomerContactController = async (
  req: Request,
  res: Response
) => {
  try {
    const agentId =
      req.params.agentId as string;

    const searchRequestId =
      req.params.searchRequestId as string;

    /**
     * بررسی وجود پارامترهای مسیر
     */
    if (!agentId || !searchRequestId) {
      return res.status(400).json({
        message:
          "agentId and searchRequestId are required",
      });
    }

    /**
     * اجرای Use Case
     */
    const result =
      await accessCustomerContact(
        agentId,
        searchRequestId
      );

    return res.status(200).json(result);
  } catch (error) {

    /**
     * Search Request پیدا نشد
     */
    if (
      error instanceof Error &&
      error.message ===
        "Search request not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    /**
     * Customer پیدا نشد
     */
    if (
      error instanceof Error &&
      error.message ===
        "Customer not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

        /**
     * Search Request بسته است
     */
    if (
      error instanceof Error &&
      error.message ===
        "Only active search requests can be accessed"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    /**
     * Agent اشتراک فعال ندارد
     */
    if (
      error instanceof Error &&
      error.message ===
        "Active subscription not found"
    ) {
      return res.status(403).json({
        message: error.message,
      });
    }

    /**
     * سقف مصرف ماهانه تمام شده است
     */
    if (
      error instanceof Error &&
      error.message ===
        "Monthly contact access limit reached"
    ) {
      return res.status(403).json({
        message: error.message,
      });
    }

    /**
     * خطای پیش‌بینی‌نشده
     */
    console.error(
      "Error accessing customer contact:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};