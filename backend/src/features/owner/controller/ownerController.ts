/**
 * ============================================================
 * Owner Controller
 * ============================================================
 *
 * Controller مسئول ارتباط HTTP است.
 *
 * وظایف:
 * - دریافت پارامترهای Request
 * - فراخوانی Service
 * - تبدیل نتیجه به HTTP Response
 * - مدیریت خطاهای شناخته‌شده
 *
 * منطق Business در Service قرار دارد.
 * ============================================================
 */

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import {
  getOwnerProfile,
  getCurrentOwnerProfile,
  getCurrentOwnerPropertiesService,
  updateCurrentOwnerProfileService,
  getOwnerPropertiesService,
  updateOwnerProfileService,
} from "../service/ownerService";

/**
 * نوع پارامترهای Route مربوط به Owner
 *
 * ownerId در این Route باید یک مقدار string باشد.
 */
type OwnerRouteParams = {
  ownerId: string;
};

/**
 * ------------------------------------------------------------
 * دریافت Profile مالک
 * ------------------------------------------------------------
 *
 * GET /owners/:ownerId/profile
 */
export async function getOwnerProfileController(
  req: Request<OwnerRouteParams>,
  res: Response
) {
  try {
    const owner =
      await getOwnerProfile(
        req.params.ownerId
      );

    return res.status(200).json(owner);
  } catch (error: any) {
    if (error.message === "Owner not found") {
      return res.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Error getting owner profile:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * ------------------------------------------------------------
 * ویرایش Profile مالک
 * ------------------------------------------------------------
 *
 * PUT /owners/:ownerId/profile
 */
export async function updateOwnerProfileController(
  req: Request<OwnerRouteParams>,
  res: Response
) {
  try {
    const owner =
      await updateOwnerProfileService(
        req.params.ownerId,
        req.body
      );

    return res.status(200).json(owner);
  } catch (error: any) {
    if (error.message === "Owner not found") {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error.message ===
        "First name cannot be empty" ||
      error.message ===
        "Last name cannot be empty" ||
      error.message ===
        "No profile fields to update"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Error updating owner profile:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * GET /owners/:ownerId/properties
 */
export async function getOwnerPropertiesController(
  req: Request<OwnerRouteParams>,
  res: Response
) {
  try {
    const properties = await getOwnerPropertiesService(req.params.ownerId);
    return res.status(200).json({ properties });
  } catch (error: any) {
    if (error.message === "Owner not found") return res.status(404).json({ message: error.message });
    console.error("Error getting owner properties:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

function getAuthenticatedOwnerUserId(req: Request): string | undefined {
  return (req as AuthenticatedRequest).user?.id;
}

/** GET /owners/me/profile */
export async function getCurrentOwnerProfileController(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedOwnerUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    const owner = await getCurrentOwnerProfile(userId);
    return res.status(200).json(owner);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "OWNER_PROFILE_NOT_FOUND") {
      return res.status(404).json({ message: "Owner profile not found" });
    }
    console.error("Error getting current owner profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** PUT /owners/me/profile */
export async function updateCurrentOwnerProfileController(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedOwnerUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    const owner = await updateCurrentOwnerProfileService(userId, req.body);
    return res.status(200).json(owner);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "OWNER_PROFILE_NOT_FOUND") {
        return res.status(404).json({ message: "Owner profile not found" });
      }
      if ([
        "First name cannot be empty",
        "Last name cannot be empty",
        "No profile fields to update",
      ].includes(error.message)) {
        return res.status(400).json({ message: error.message });
      }
    }
    console.error("Error updating current owner profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** GET /owners/me/properties */
export async function getCurrentOwnerPropertiesController(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedOwnerUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    const properties = await getCurrentOwnerPropertiesService(userId);
    return res.status(200).json({ properties });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "OWNER_PROFILE_NOT_FOUND") {
      return res.status(404).json({ message: "Owner profile not found" });
    }
    console.error("Error getting current owner properties:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
