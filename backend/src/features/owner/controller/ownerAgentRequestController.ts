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

export async function getActiveOwnerAgentRequestsController(_req: Request, res: Response) {
  try { return res.status(200).json({ requests: await getActiveOwnerAgentRequestsService() }); }
  catch (e) { console.error("Error listing active owner requests:", e); return res.status(500).json({ message: "Internal server error" }); }
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
