import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import {
  accessOwnerRequestContactService, closeOwnerAgentRequestService, createOwnerAgentRequestService,
  getActiveOwnerAgentRequestsService, getOwnerAgentRequestsService,
} from "../service/ownerAgentRequestService";

const actorId = (req: Request) => (req as AuthenticatedRequest).user?.id;
const routeParam = (req: Request, key: string): string => {
  const value = req.params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
};

export async function createOwnerAgentRequestController(req: Request, res: Response) {
  const userId = actorId(req);
  if (!userId) return res.status(401).json({ message: "Authentication required" });
  try { return res.status(201).json(await createOwnerAgentRequestService(routeParam(req, "ownerId"), req.body ?? {})); }
  catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "Property ID is required" || message === "An active request already exists for this property") return res.status(400).json({ message });
    if (message === "Property does not belong to owner") return res.status(403).json({ message });
    console.error("Error creating owner agent request:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getOwnerAgentRequestsController(req: Request, res: Response) {
  try { return res.status(200).json({ requests: await getOwnerAgentRequestsService(routeParam(req, "ownerId")) }); }
  catch (e) { console.error("Error listing owner requests:", e); return res.status(500).json({ message: "Internal server error" }); }
}

export async function closeOwnerAgentRequestController(req: Request, res: Response) {
  try { return res.status(200).json(await closeOwnerAgentRequestService(routeParam(req, "ownerId"), routeParam(req, "requestId"))); }
  catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "Active owner request not found") return res.status(404).json({ message });
    console.error("Error closing owner request:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getActiveOwnerAgentRequestsController(req: Request, res: Response) {
  try { return res.status(200).json({ requests: await getActiveOwnerAgentRequestsService(routeParam(req, "agentId")) }); }
  catch (e) { console.error("Error listing active owner requests:", e); return res.status(500).json({ message: "Internal server error" }); }
}

export async function respondToOwnerAgentRequestController(req: Request, res: Response) {
  const response = req.body?.response;
  if (response !== "ACCEPTED" && response !== "REJECTED") {
    return res.status(400).json({ message: "پاسخ باید پذیرش یا رد درخواست باشد." });
  }
  try {
    const result = await respondToOwnerAgentRequestService(routeParam(req, "agentId"), routeParam(req, "requestId"), response);
    return res.status(200).json({ response: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ACTIVE_OWNER_REQUEST_NOT_FOUND") return res.status(404).json({ message: "درخواست فعال پیدا نشد." });
    console.error("Error responding to owner request:", error);
    return res.status(500).json({ message: "ثبت پاسخ درخواست ناموفق بود." });
  }
}

export async function accessOwnerRequestContactController(req: Request, res: Response) {
  try { return res.status(200).json(await accessOwnerRequestContactService(routeParam(req, "agentId"), routeParam(req, "requestId"))); }
  catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "Active owner request not found") return res.status(404).json({ message });
    if (message === "Active subscription not found" || message === "Monthly contact access limit reached") return res.status(403).json({ message });
    console.error("Error accessing owner contact and address:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
