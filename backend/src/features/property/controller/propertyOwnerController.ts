/**
 * ============================================================
 * Property Owner Controller
 * ============================================================
 *
 * وظیفه Controller:
 *
 * HTTP Request
 *      ↓
 * استخراج داده‌های Request
 *      ↓
 * فراخوانی Service
 *      ↓
 * HTTP Response
 *
 * Controller نباید منطق Business داشته باشد.
 */

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  addPropertyOwner,
} from "../service/propertyOwnerService";

/**
 * ============================================================
 * Add Property Owner
 * ============================================================
 *
 * POST /properties/:id/owners
 *
 * Body:
 *
 * {
 *   "ownerId": "...",
 *   "share": 3,
 *   "isPrimary": true
 * }
 */
export async function addPropertyOwnerController(
  req: Request<
    { id: string },
    unknown,
    {
      ownerId: string;
      share: number;
      isPrimary?: boolean;
    }
  >,
  res: Response
) {
  try {
    /**
     * Property ID از URL
     */
    const propertyId = req.params.id;

    const actor = (req as AuthenticatedRequest).user;
    if (!actor) {
      return res.status(401).json({ message: "Authentication required" });
    }

    /**
     * اطلاعات مالک از Body
     */
    const {
      ownerId,
      share,
      isPrimary,
    } = req.body;

    /**
     * فراخوانی Business Logic
     */
    const propertyOwner =
      await addPropertyOwner({
        propertyId,
        ownerId,
        share,
        performedBy: actor.id,
        isPrimary,
      });

    /**
     * پاسخ موفق
     */
    return res.status(201).json({
      propertyOwner,
    });
  } catch (error) {
    /**
     * خطای Business را فعلاً با 400
     * به Client برمی‌گردانیم.
     *
     * بعداً می‌توانیم Error Handling مرکزی
     * برای کل Backend ایجاد کنیم.
     */
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در ثبت مالک رخ داد.",
    });
  }
}