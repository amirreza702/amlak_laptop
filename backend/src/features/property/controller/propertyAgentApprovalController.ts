import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { approvePropertyAgentByOwnerService } from "../service/propertyAgentApprovalService";

export async function approvePropertyAgentByOwnerController(req: Request, res: Response) {
  const actor = (req as AuthenticatedRequest).user;
  if (!actor) return res.status(401).json({ message: "Authentication required" });

  try {
    const propertyAgent = await approvePropertyAgentByOwnerService({
      propertyId: String(req.params.id),
      agentId: String(req.params.agentId),
      actor,
    });
    return res.status(200).json({ propertyAgent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطایی در تأیید مشاور رخ داد.";
    if (message === "OWNER_PROFILE_NOT_FOUND" || message === "ملک مورد نظر پیدا نشد.") {
      return res.status(404).json({ message });
    }
    if (message === "این مالک به ملک مورد نظر متصل نیست." || message === "AGENT_NOT_VERIFIED") {
      return res.status(403).json({
        message: message === "AGENT_NOT_VERIFIED" ? "مشاور هنوز تأیید هشتی را دریافت نکرده است." : message,
      });
    }
    return res.status(400).json({ message });
  }
}
