import type { Request, Response } from "express";

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
    const propertyId = req.params.id;

    const matches =
      await findDuplicateMatchesService(
        propertyId
      );

    return res.status(200).json({
      matches,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در پیدا کردن املاک مشابه رخ داد.",
    });
  }
}