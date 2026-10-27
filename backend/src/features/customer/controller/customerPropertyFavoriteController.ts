/**
 * ============================================================
 * Customer Property Favorite Controller
 * ============================================================
 *
 * Controller مسئول دریافت Request و ارسال Response است.
 *
 * منطق Business مربوط به Favorite در Service قرار دارد.
 * ============================================================
 */

import { Request, Response } from "express";

import {
  addPropertyToFavorite,
  removePropertyFromFavorite,
  getCustomerFavorites,
} from "../service/customerPropertyFavoriteService";

/**
 * ============================================================
 * افزودن ملک به علاقه‌مندی
 * ============================================================
 *
 * POST
 * /customers/:customerId/favorites/:propertyId
 *
 * customerId و propertyId از URL دریافت می‌شوند.
 */
export async function addPropertyToFavoriteController(
  req: Request<{
    customerId: string;
    propertyId: string;
  }>,
  res: Response
) {
  try {
    const result = await addPropertyToFavorite(
      req.params.customerId,
      req.params.propertyId
    );

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      message:
        error.message ||
        "خطا در افزودن ملک به علاقه‌مندی",
    });
  }
}

/**
 * ============================================================
 * حذف ملک از علاقه‌مندی
 * ============================================================
 *
 * DELETE
 * /customers/:customerId/favorites/:propertyId
 */
export async function removePropertyFromFavoriteController(
  req: Request<{
    customerId: string;
    propertyId: string;
  }>,
  res: Response
) {
  try {
    const result = await removePropertyFromFavorite(
      req.params.customerId,
      req.params.propertyId
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      message:
        error.message ||
        "خطا در حذف ملک از علاقه‌مندی",
    });
  }
}

/**
 * ============================================================
 * دریافت علاقه‌مندی‌های مشتری
 * ============================================================
 *
 * GET
 * /customers/:customerId/favorites
 */
export async function getCustomerFavoritesController(
  req: Request<{ customerId: string }>,
  res: Response
) {
  try {
    const favorites = await getCustomerFavorites(
      req.params.customerId
    );

    res.status(200).json(favorites);
  } catch (error: any) {
    res.status(404).json({
      message:
        error.message ||
        "علاقه‌مندی‌های مشتری پیدا نشد.",
    });
  }
}