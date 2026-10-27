import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  createVerificationCaseService,
  reviewVerificationCaseService,
} from "../service/verificationCaseService";

/**
 * ============================================================
 * Create Verification Case Controller
 * ============================================================
 *
 * POST /properties/:id/verification
 *
 * ایجاد یک پرونده جدید برای بررسی ملک.
 */
export async function createVerificationCaseController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const verificationCase =
      await createVerificationCaseService(propertyId);

    return res.status(201).json({
      verificationCase,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در ایجاد پرونده تأیید رخ داد.",
    });
  }
}

/**
 * ============================================================
 * Review Verification Case Controller
 * ============================================================
 *
 * PATCH /verification-cases/:id/review
 *
 * این Controller فقط اطلاعات HTTP را دریافت می‌کند
 * و آن‌ها را به Service تحویل می‌دهد.
 *
 * تصمیم‌گیری Business در Service انجام می‌شود.
 */
export async function reviewVerificationCaseController(
  req: Request<
    { id: string },
    unknown,
    {
      status: "VERIFIED" | "REJECTED";
      notes?: string | null;
    }
  >,
  res: Response
) {
  try {
    const verificationCaseId = req.params.id;

    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { status, notes = null } = req.body;

    const verificationCase =
      await reviewVerificationCaseService({
        verificationCaseId,
        status,
        reviewedBy: user.id,
        notes,
      });

    return res.status(200).json({
      verificationCase,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در بررسی پرونده تأیید رخ داد.",
    });
  }
}