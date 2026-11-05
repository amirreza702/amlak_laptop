/**
 * Controller فقط پارامترهای هدف را از Route می‌گیرد؛
 * هویت مالک/مشاور همواره از نشست احراز هویت‌شده استخراج می‌شود.
 */

import type { Request, Response } from "express";

import {
  revokePropertyAgent,
  revokePropertyAgentByAgent,
} from "../service/propertyAgentRevocationService";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

export async function revokePropertyAgentController(req: Request, res: Response) {
  const ownerUserId = (req as AuthenticatedRequest).user?.id;
  if (!ownerUserId) return res.status(401).json({ message: "Authentication required" });

  try {
    const propertyAgent = await revokePropertyAgent({
      propertyId: String(req.params.id),
      agentId: String(req.params.agentId),
      ownerUserId,
    });
    return res.status(200).json({ propertyAgent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطایی در لغو همکاری مشاور رخ داد.";
    if (message === "OWNER_PROFILE_NOT_FOUND" || message === "ملک مورد نظر پیدا نشد.") {
      return res.status(404).json({ message });
    }
    if (message === "این مالک به ملک مورد نظر متصل نیست.") {
      return res.status(403).json({ message });
    }
    return res.status(400).json({ message });
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
