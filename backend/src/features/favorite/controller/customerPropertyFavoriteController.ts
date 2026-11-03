/**
 * ============================================================
 * Customer Property Favorite Controller
 * ============================================================
 *
 * وظیفه:
 *
 * فقط دریافت Request و ارسال Response.
 *
 * Business Logic در Service قرار دارد.
 *
 * ============================================================
 */

import type { Request, Response } from "express";

import {
  addPropertyToFavoritesService,
  removePropertyFromFavoritesService,
  isPropertyFavoriteService,
  getCustomerFavoritesService,
} from "../service/customerPropertyFavoriteService";

/**
 * افزودن ملک به علاقه‌مندی
 */
export async function addPropertyToFavoritesController(
  req: Request,
  res: Response
) {
  try {
    const customerId = req.params.customerId;
    const propertyId = req.params.propertyId;

    if (
      !customerId ||
      Array.isArray(customerId) ||
      !propertyId ||
      Array.isArray(propertyId)
    ) {
      return res.status(400).json({
        message: "شناسه مشتری یا ملک نامعتبر است.",
      });
    }

    const favorite =
      await addPropertyToFavoritesService(
        customerId,
        propertyId
      );

    return res.status(201).json(favorite);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطا در افزودن ملک به علاقه‌مندی‌ها.",
    });
  }
}

/**
 * حذف ملک از علاقه‌مندی
 */
export async function removePropertyFromFavoritesController(
  req: Request,
  res: Response
) {
  try {
    const customerId = req.params.customerId;
    const propertyId = req.params.propertyId;

    if (
      !customerId ||
      Array.isArray(customerId) ||
      !propertyId ||
      Array.isArray(propertyId)
    ) {
      return res.status(400).json({
        message: "شناسه مشتری یا ملک نامعتبر است.",
      });
    }

    const favorite =
      await removePropertyFromFavoritesService(
        customerId,
        propertyId
      );

    return res.status(200).json(favorite);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطا در حذف ملک از علاقه‌مندی‌ها.",
    });
  }
}

/**
 * بررسی اینکه یک ملک در علاقه‌مندی مشتری هست یا نه
 */
export async function isPropertyFavoriteController(
  req: Request,
  res: Response
) {
  try {
    const customerId = req.params.customerId;
    const propertyId = req.params.propertyId;

    if (
      !customerId ||
      Array.isArray(customerId) ||
      !propertyId ||
      Array.isArray(propertyId)
    ) {
      return res.status(400).json({
        message: "شناسه مشتری یا ملک نامعتبر است.",
      });
    }

    const isFavorite =
      await isPropertyFavoriteService(
        customerId,
        propertyId
      );

    return res.status(200).json({
      isFavorite,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطا در بررسی علاقه‌مندی.",
    });
  }
}

/**
 * دریافت تمام علاقه‌مندی‌های مشتری
 */
export async function getCustomerFavoritesController(
  req: Request,
  res: Response
) {
  try {
    const customerId = req.params.customerId;

    if (
      !customerId ||
      Array.isArray(customerId)
    ) {
      return res.status(400).json({
        message: "شناسه مشتری نامعتبر است.",
      });
    }

    const favorites =
      await getCustomerFavoritesService(customerId);

    return res.status(200).json(favorites);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطا در دریافت علاقه‌مندی‌ها.",
    });
  }
}