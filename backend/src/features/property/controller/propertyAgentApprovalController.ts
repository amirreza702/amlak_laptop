import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { approvePropertyAgentByOwnerService } from "../service/propertyAgentApprovalService";

export async function approvePropertyAgentByOwnerController(req: Request, res: Response) {
  const ownerUserId = (req as AuthenticatedRequest).user?.id;
  if (!ownerUserId) return res.status(401).json({ message: "Authentication required" });

  try {
    const propertyAgent = await approvePropertyAgentByOwnerService({
      propertyId: String(req.params.id),
      agentId: String(req.params.agentId),
      ownerUserId,
    });
    return res.status(200).json({ propertyAgent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطایی در تأیید مشاور رخ داد.";
    if (message === "OWNER_PROFILE_NOT_FOUND" || message === "ملک مورد نظر پیدا نشد.") {
      return res.status(404).json({ message });
    }
    if (message === "این مالک به ملک مورد نظر متصل نیست.") {
      return res.status(403).json({ message });
    }
    return res.status(400).json({ message });
  }
}
