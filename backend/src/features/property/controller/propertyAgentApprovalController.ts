/**
 * ============================================================
 * Property Agent Approval Controller
 * ============================================================
 *
 * وظیفه Controller:
 *
 * HTTP Request
 *      ↓
 * دریافت propertyId
 * دریافت agentId
 * دریافت ownerId
 *      ↓
 * Property Agent Approval Service
 *      ↓
 * HTTP Response
 *
 * نکته:
 *
 * فعلاً ownerId از Request دریافت می‌شود.
 *
 * بعداً با Authentication،
 * ownerId باید از کاربر احراز هویت‌شده استخراج شود
 * و نباید Client بتواند آن را تعیین کند.
 */

import type { Request, Response } from "express";

import {
  approvePropertyAgentByOwnerService,
} from "../service/propertyAgentApprovalService";

export async function approvePropertyAgentByOwnerController(
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
      await approvePropertyAgentByOwnerService({
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
          : "خطایی در تأیید مشاور رخ داد.",
    });
  }
}