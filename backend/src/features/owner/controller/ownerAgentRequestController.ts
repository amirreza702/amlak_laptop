import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import {
  accessOwnerRequestContactService,
  closeOwnerAgentRequestService,
  createOwnerAgentRequestService,
  getActiveOwnerAgentRequestsService,
  getOwnerAgentRequestsService,
  respondToOwnerAgentRequestService,
} from "../service/ownerAgentRequestService";

const actorId = (req: Request) => (req as AuthenticatedRequest).user?.id;

export async function createOwnerAgentRequestController(req: Request, res: Response) {
  const userId = actorId(req);
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  try {
    return res.status(201).json(await createOwnerAgentRequestService(userId, req.body ?? {}));
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "Property ID is required" || message === "An active request already exists for this property") {
      return res.status(400).json({ message });
    }
    if (message === "OWNER_PROFILE_NOT_FOUND") return res.status(404).json({ message: "Owner profile not found" });
    if (message === "Property does not belong to owner") return res.status(403).json({ message });
    console.error("Error creating owner agent request:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getOwnerAgentRequestsController(req: Request, res: Response) {
  const userId = actorId(req);
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  try {
    return res.status(200).json({ requests: await getOwnerAgentRequestsService(userId) });
  } catch (e) {
    if (e instanceof Error && e.message === "OWNER_PROFILE_NOT_FOUND") {
      return res.status(404).json({ message: "Owner profile not found" });
    }
    console.error("Error listing owner requests:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function closeOwnerAgentRequestController(req: Request, res: Response) {
  const userId = actorId(req);
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  const requestId = typeof req.params.requestId === "string" ? req.params.requestId : "";
  try {
    return res.status(200).json(await closeOwnerAgentRequestService(userId, requestId));
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "Active owner request not found") return res.status(404).json({ message });
    if (message === "OWNER_PROFILE_NOT_FOUND") return res.status(404).json({ message: "Owner profile not found" });
    console.error("Error closing owner request:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getActiveOwnerAgentRequestsController(req: Request, res: Response) {
  const userId = actorId(req);
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  try {
    return res.status(200).json({ requests: await getActiveOwnerAgentRequestsService(userId) });
  } catch (e) {
    if (e instanceof Error && e.message === "AGENT_PROFILE_NOT_FOUND") {
      return res.status(404).json({ message: "Agent profile not found" });
    }
    console.error("Error listing active owner requests:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function respondToOwnerAgentRequestController(req: Request, res: Response) {
  const userId = actorId(req);
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  const response = req.body?.response;
  if (response !== "ACCEPTED" && response !== "REJECTED") {
    return res.status(400).json({ message: "پاسخ باید پذیرش یا رد درخواست باشد." });
  }

  const requestId = typeof req.params.requestId === "string" ? req.params.requestId : "";
  try {
    const result = await respondToOwnerAgentRequestService(userId, requestId, response);
    return res.status(200).json({ response: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ACTIVE_OWNER_REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "درخواست فعال پیدا نشد." });
    }
    if (code === "AGENT_PROFILE_NOT_FOUND") {
      return res.status(404).json({ message: "Agent profile not found" });
    }
    if (code === "AGENT_NOT_AUTHORIZED_FOR_OWNER_REQUEST") {
      return res.status(403).json({ message: "مشاور مجاز به پاسخ‌گویی به این درخواست نیست." });
    }
    console.error("Error responding to owner request:", error);
    return res.status(500).json({ message: "ثبت پاسخ درخواست ناموفق بود." });
  }
}

export async function accessOwnerRequestContactController(req: Request, res: Response) {
  const userId = actorId(req);
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  const requestId = typeof req.params.requestId === "string" ? req.params.requestId : "";
  try {
    return res.status(200).json(await accessOwnerRequestContactService(userId, requestId));
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "Active owner request not found") return res.status(404).json({ message });
    if (message === "AGENT_NOT_APPROVED_FOR_OWNER_REQUEST") {
      return res.status(403).json({ message: "مالک هنوز این مشاور را برای ملک انتخاب نکرده است." });
    }
    console.error("Error accessing owner contact and address:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
