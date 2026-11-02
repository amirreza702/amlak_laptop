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
  revokePropertyAgentByAgent,
} from "../service/propertyAgentRevocationService";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

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

/** لغو رابطه تأییدشده از سوی مشاور واردشده. */
export async function revokePropertyAgentByAgentController(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  try {
    const propertyAgent = await revokePropertyAgentByAgent(String(req.params.id), userId);
    return res.status(200).json({ propertyAgent, message: "رابطه همکاری لغو شد و مالک مطلع گردید." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AGENT_PROFILE_NOT_FOUND") return res.status(404).json({ message: "پروفایل مشاور پیدا نشد." });
    if (code === "APPROVED_AGENT_RELATION_NOT_FOUND") return res.status(404).json({ message: "رابطه تأییدشده فعالی برای لغو وجود ندارد." });
    console.error("Agent collaboration revocation failed:", error);
    return res.status(500).json({ message: "لغو رابطه همکاری ناموفق بود." });
  }
}
