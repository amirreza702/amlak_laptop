/**
 * ============================================================
 * Property Agent Revocation Controller
 * ============================================================
 *
 * وظیفه:
 *
 * دریافت درخواست لغو همکاری Agent با Property
 * و ارسال آن به Service.
 *
 * جریان:
 *
 * HTTP Request
 *      ↓
 * Controller
 *      ↓
 * Revocation Service
 *      ↓
 * HTTP Response
 *
 * نکته:
 *
 * ownerId فعلاً از Body دریافت می‌شود.
 *
 * بعداً با Authentication،
 * ownerId از کاربر احراز هویت‌شده استخراج خواهد شد.
 */

import type { Request, Response } from "express";

import {
  revokePropertyAgent,
} from "../service/propertyAgentRevocationService";

export async function revokePropertyAgentController(
  req: Request<
    {
      id: string;
      agentId: string;
    },
    unknown,
    {
      ownerId: string;
    }
  >,
  res: Response
) {
  try {
    const propertyId = req.params.id;
    const agentId = req.params.agentId;

    const { ownerId } = req.body;

    const propertyAgent =
      await revokePropertyAgent({
        propertyId,
        agentId,
        ownerId,
      });

    return res.status(200).json({
      propertyAgent,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در لغو همکاری مشاور رخ داد.",
    });
  }
}