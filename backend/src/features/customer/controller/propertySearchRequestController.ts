/**
 * ============================================================
 * Property Search Request Controller
 * ============================================================
 *
 * Controller مسئول دریافت HTTP Request و ارسال Response است.
 *
 * منطق Business در Service قرار دارد.
 * ============================================================
 */

import { Request, Response } from "express";

import {
  createCustomerSearchRequest,
  getCustomerSearchRequest,
  getCustomerSearchRequests,
  closeCustomerSearchRequest,
  updateCustomerSearchRequest,
  getActivePropertySearchRequests,
  getActivePropertySearchRequestById,
} from "../service/propertySearchRequestService";

/**
 * ایجاد درخواست جستجوی ملک
 */
export async function createCustomerSearchRequestController(
  req: Request<{
    customerId: string;
  }>,
  res: Response
) {
  try {
    const result =
      await createCustomerSearchRequest(
        req.params.customerId,
        req.body
      );

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      message:
        error.message ||
        "خطا در ایجاد درخواست جستجو",
    });
  }
}

/**
 * دریافت یک درخواست جستجو
 */
export async function getCustomerSearchRequestController(
  req: Request<{
    customerId: string;
    requestId: string;
  }>,
  res: Response
) {
  try {
    const result =
      await getCustomerSearchRequest(
        req.params.customerId,
        req.params.requestId
      );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(404).json({
      message:
        error.message ||
        "درخواست جستجو پیدا نشد",
    });
  }
}

/**
 * دریافت تمام درخواست‌های مشتری
 */
export async function getCustomerSearchRequestsController(
  req: Request<{
    customerId: string;
  }>,
  res: Response
) {
  try {
    const result =
      await getCustomerSearchRequests(
        req.params.customerId
      );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(404).json({
      message:
        error.message ||
        "درخواست‌های جستجوی مشتری پیدا نشد",
    });
  }
}

/**
 * بستن درخواست جستجوی مشتری
 */
export async function closeCustomerSearchRequestController(
  req: Request<{
    customerId: string;
    requestId: string;
  }>,
  res: Response
) {
  try {
    const result =
      await closeCustomerSearchRequest(
        req.params.customerId,
        req.params.requestId
      );

    res.status(200).json(result);
  } catch (error: any) {
    if (
      error.message ===
      "Search request not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Customer not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Search request does not belong to customer"
    ) {
      return res.status(403).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Only active search requests can be closed"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error closing customer search request:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
}

/**
 * ویرایش درخواست جستجوی مشتری
 */
export async function updateCustomerSearchRequestController(
  req: Request<{
    customerId: string;
    requestId: string;
  }>,
  res: Response
) {
  try {
    const result =
      await updateCustomerSearchRequest(
        req.params.customerId,
        req.params.requestId,
        req.body
      );

    return res.status(200).json(result);
  } catch (error: any) {
    if (
      error.message ===
      "Customer not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Search request not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Search request does not belong to customer"
    ) {
      return res.status(403).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Only active search requests can be updated"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "City is required"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Budget cannot be negative"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error updating customer search request:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
}

/**
 * دریافت درخواست‌های فعال جستجوی ملک
 *
 * این اطلاعات برای Agent قابل مشاهده است.
 * اطلاعات تماس مشتری در این مرحله نمایش داده نمی‌شود.
 */
export async function getActivePropertySearchRequestsController(
  req: Request,
  res: Response
) {
  try {
    const result =
      await getActivePropertySearchRequests({
        city: typeof req.query.city === "string" ? req.query.city : undefined,
        transactionType: typeof req.query.transactionType === "string" ? req.query.transactionType : undefined,
        propertyType: typeof req.query.propertyType === "string" ? req.query.propertyType : undefined,
        minBudget: typeof req.query.minBudget === "string" ? req.query.minBudget : undefined,
        maxBudget: typeof req.query.maxBudget === "string" ? req.query.maxBudget : undefined,
        hashtiVerified: typeof req.query.hashtiVerified === "string" ? req.query.hashtiVerified : undefined,
        createdFrom: typeof req.query.createdFrom === "string" ? req.query.createdFrom : undefined,
        createdTo: typeof req.query.createdTo === "string" ? req.query.createdTo : undefined,
      });

    return res.status(200).json(result);
  } catch (error: any) {
    if (typeof error?.message === "string" && (error.message.startsWith("Invalid ") || error.message.includes("cannot exceed"))) {
      return res.status(400).json({ message: error.message });
    }
    console.error(
      "Error getting active property search requests:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
}

/**
 * دریافت جزئیات یک درخواست فعال جستجوی ملک
 *
 * این اطلاعات برای Agent قابل مشاهده است.
 *
 * اطلاعات تماس و customerId در این مرحله
 * برگردانده نمی‌شود.
 */
export async function getActivePropertySearchRequestByIdController(
  req: Request<{ requestId: string }>,
  res: Response
) {
  try {
    const result =
      await getActivePropertySearchRequestById(
        req.params.requestId
      );

    return res.status(200).json(result);
  } catch (error: any) {
    if (
      error.message ===
      "Active search request not found"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Error getting active property search request:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

