import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  findDuplicateMatchesService,
} from "../service/duplicateMatchingService";

/**
 * ============================================================
 * Find Duplicate Matches
 * ============================================================
 *
 * GET /properties/:id/duplicate-matches
 *
 * این Endpoint فقط Candidateهای مشکوک به Duplicate را
 * برمی‌گرداند.
 *
 * هیچ DuplicateReviewای در این مرحله ایجاد نمی‌شود.
 */
export async function findDuplicateMatchesController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });
    const propertyId = req.params.id;

    const matches =
      await findDuplicateMatchesService(propertyId, { id: user.id, role: user.role, isActive: user.isActive });

    return res.status(200).json({
      matches,
    });
  } catch (error) {
    return res.status(error instanceof Error && error.message.includes("FORBIDDEN") ? 403 : 400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در پیدا کردن املاک مشابه رخ داد.",
    });
  }
}