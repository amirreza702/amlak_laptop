import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  expirePropertyListing,
} from "../service/expirePropertyListingService";

/**
 * بررسی انقضای اعتبار ملک
 *
 * اگر confirmUntil گذشته باشد و Listing
 * در وضعیت PUBLISHED باشد، آن را EXPIRED می‌کند.
 */
export async function expirePropertyListingController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const actor = (req as AuthenticatedRequest).user;
    if (!actor) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result =
      await expirePropertyListing(
        req.params.id,
        actor.id
      );

    res.status(200).json(result);
  } catch (error: any) {
    if (error?.message === "HASHTI_PERMISSION_REQUIRED") {
      return res.status(403).json({ message: "Hashti permission required" });
    }
    res.status(404).json({
      message:
        error.message ||
        "خطا در بررسی انقضای ملک",
    });
  }
}