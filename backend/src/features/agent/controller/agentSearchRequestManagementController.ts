import { Request, Response } from "express";
import { PropertyType, TransactionType } from "@prisma/client";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import {
  deleteOwnAgentSearchRequestService,
  getAllAgentSearchRequestsService,
  updateOwnAgentSearchRequestService,
} from "../service/agentSearchRequestManagementService";

function getActor(req: Request) {
  return (req as AuthenticatedRequest).user;
}
function routeParam(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
const propertyTypes = new Set(Object.values(PropertyType));
const transactionTypes = new Set(Object.values(TransactionType));

export async function updateOwnAgentSearchRequestController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });

  const {
    transactionType, propertyType, city, budget, description,
    requesterFirstName, requesterLastName, requesterMobile,
  } = req.body ?? {};

  if (
    (transactionType !== undefined && !transactionTypes.has(transactionType)) ||
    (propertyType !== undefined && !propertyTypes.has(propertyType)) ||
    (city !== undefined && (typeof city !== "string" || !city.trim())) ||
    (budget !== undefined && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) ||
    (description !== undefined && description !== null && typeof description !== "string") ||
    (requesterFirstName !== undefined && requesterFirstName !== null && typeof requesterFirstName !== "string") ||
    typeof requesterLastName !== "string" || !requesterLastName.trim() ||
    typeof requesterMobile !== "string" || !requesterMobile.trim()
  ) {
    return res.status(400).json({ message: "نام خانوادگی و شماره تماس مشتری الزامی است." });
  }

  try {
    const updated = await updateOwnAgentSearchRequestService(actor, routeParam(req, "requestId"), {
      transactionType,
      propertyType,
      city,
      budget: budget === undefined ? undefined : Number(budget),
      description,
      requesterFirstName,
      requesterLastName,
      requesterMobile,
    });
    return res.status(200).json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "SEARCH_REQUEST_NOT_FOUND") return res.status(404).json({ message: "Search request not found or not owned by this agent" });
    if (code === "AGENT_VERIFICATION_REQUIRED" || code === "AGENT_SEARCH_REQUEST_FORBIDDEN" || code === "SEARCH_REQUEST_MANAGEMENT_FORBIDDEN") {
      return res.status(403).json({ message: "Search request management denied" });
    }
    console.error("Could not update agent search request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteOwnAgentSearchRequestController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    await deleteOwnAgentSearchRequestService(actor, routeParam(req, "requestId"));
    return res.status(204).send();
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "SEARCH_REQUEST_NOT_FOUND") return res.status(404).json({ message: "Search request not found or not owned by this agent" });
    if (code === "AGENT_VERIFICATION_REQUIRED" || code === "AGENT_SEARCH_REQUEST_FORBIDDEN" || code === "SEARCH_REQUEST_MANAGEMENT_FORBIDDEN") {
      return res.status(403).json({ message: "Search request management denied" });
    }
    console.error("Could not delete agent search request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAllAgentSearchRequestsController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    const rows = await getAllAgentSearchRequestsService(actor);
    return res.status(200).json(rows);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AGENT_VERIFICATION_REQUIRED" || code === "AGENT_SEARCH_REQUEST_FORBIDDEN" || code === "SEARCH_REQUEST_MARKETPLACE_FORBIDDEN") {
      return res.status(403).json({ message: "Search request marketplace access denied" });
    }
    console.error("Could not list search requests for agent:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
