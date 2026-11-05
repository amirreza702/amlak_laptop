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
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

function requestActor(req: Request) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new Error("AUTHENTICATION_REQUIRED");
  return { id: user.id, role: user.role, isActive: user.isActive };
}

import {
  addPropertyToFavoritesService,
  removePropertyFromFavoritesService,
  isPropertyFavoriteService,
  getCustomerFavoritesService,
  addAgentToFavoritesService,
  removeAgentFromFavoritesService,
  getCustomerFavoriteAgentsService,
  searchAgentsForCustomerFavoritesService,
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
      await addPropertyToFavoritesService(customerId, propertyId, requestActor(req));

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
      await removePropertyFromFavoritesService(customerId, propertyId, requestActor(req));

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
      await isPropertyFavoriteService(customerId, propertyId, requestActor(req));

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
      await getCustomerFavoritesService(customerId, requestActor(req));

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

export async function searchAgentsForCustomerFavoritesController(req: Request, res: Response) {
  try {
    const customerId = req.params.customerId;
    const query = typeof req.query.q === "string" ? req.query.q : "";
    if (!customerId || Array.isArray(customerId)) return res.status(400).json({ message: "شناسه مشتری نامعتبر است." });
    return res.status(200).json(await searchAgentsForCustomerFavoritesService(customerId, query, requestActor(req)));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "جست‌وجوی مشاور ناموفق بود." });
  }
}


export async function addAgentToFavoritesController(req: Request, res: Response) {
  try {
    const { customerId, agentId } = req.params;
    if (!customerId || Array.isArray(customerId) || !agentId || Array.isArray(agentId)) return res.status(400).json({ message: "شناسه مشتری یا مشاور نامعتبر است." });
    return res.status(201).json(await addAgentToFavoritesService(customerId, agentId, requestActor(req)));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "افزودن مشاور به علاقه‌مندی ناموفق بود." });
  }
}

export async function removeAgentFromFavoritesController(req: Request, res: Response) {
  try {
    const { customerId, agentId } = req.params;
    if (!customerId || Array.isArray(customerId) || !agentId || Array.isArray(agentId)) return res.status(400).json({ message: "شناسه مشتری یا مشاور نامعتبر است." });
    return res.status(200).json(await removeAgentFromFavoritesService(customerId, agentId, requestActor(req)));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "حذف مشاور از علاقه‌مندی ناموفق بود." });
  }
}

export async function getCustomerFavoriteAgentsController(req: Request, res: Response) {
  try {
    const customerId = req.params.customerId;
    if (!customerId || Array.isArray(customerId)) return res.status(400).json({ message: "شناسه مشتری نامعتبر است." });
    return res.status(200).json(await getCustomerFavoriteAgentsService(customerId, requestActor(req)));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "دریافت مشاوران علاقه‌مندی‌شده ناموفق بود." });
  }
}
