import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import { DuplicateDecision } from "@prisma/client";

import {
  createDuplicateReviewService,
  getDuplicateReviewsService,
  reviewDuplicateService,
} from "../service/duplicateReviewService";

/**
 * ============================================================
 * Create Duplicate Review
 * ============================================================
 *
 * POST /properties/:id/duplicate-reviews
 */
export async function createDuplicateReviewController(
  req: Request<
    { id: string },
    unknown,
    { candidatePropertyId: string }
  >,
  res: Response
) {
  try {
    const primaryPropertyId = req.params.id;
    const { candidatePropertyId } = req.body;

    const duplicateReview =
      await createDuplicateReviewService({
        primaryPropertyId,
        candidatePropertyId,
      });

    return res.status(201).json({
      duplicateReview,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در ایجاد بررسی تکراری بودن ملک رخ داد.",
    });
  }
}

/**
 * ============================================================
 * Get Duplicate Reviews
 * ============================================================
 *
 * GET /properties/:id/duplicate-reviews
 */
export async function getDuplicateReviewsController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const duplicateReviews =
      await getDuplicateReviewsService(propertyId);

    return res.status(200).json({
      duplicateReviews,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در دریافت بررسی‌های تکراری بودن ملک رخ داد.",
    });
  }
}

/**
 * ============================================================
 * Review Duplicate
 * ============================================================
 *
 * PATCH /duplicate-reviews/:id/review
 */
export async function reviewDuplicateController(
  req: Request<
    { id: string },
    unknown,
    {
      decision: DuplicateDecision;
      notes?: string | null;
    }
  >,
  res: Response
) {
  try {
    const duplicateReviewId = req.params.id;

    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { decision, notes = null } = req.body;

    const duplicateReview =
      await reviewDuplicateService({
        duplicateReviewId,
        decision,
        reviewedBy: user.id,
        notes,
      });

    return res.status(200).json({
      duplicateReview,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در بررسی تکراری بودن ملک رخ داد.",
    });
  }
}