/**
 * ============================================================
 * Property Owner Verification Controller
 * ============================================================
 *
 * وظیفه Controller:
 *
 * HTTP Request
 *      ↓
 * دریافت propertyId و ownerId
 *      ↓
 * دریافت status و reason
 *      ↓
 * Verification Service
 *      ↓
 * HTTP Response
 *
 * شناسه انجام‌دهنده از نشست کاربر HASHTI استخراج می‌شود؛
 * Client نمی‌تواند هویت ثبت‌شده در تاریخچه را جعل کند.
 */

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import { VerificationStatus } from "@prisma/client";

import {
  verifyPropertyOwner,
} from "../service/propertyOwnerVerificationService";

export async function verifyPropertyOwnerController(
  req: Request<
    { id: string; ownerId: string },
    unknown,
    {
      status: VerificationStatus;
      reason?: string;
    }
  >,
  res: Response
) {
  try {
    const propertyId = req.params.id;
    const ownerId = req.params.ownerId;
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { status, reason } = req.body;

    const propertyOwner =
      await verifyPropertyOwner({
        propertyId,
        ownerId,
        status,
        reason,
        performedBy: user.id,
      });

    return res.status(200).json({
      propertyOwner,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در تأیید مالک رخ داد.",
    });
  }
}