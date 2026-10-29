import { Request, Response } from "express";
import { PropertyType, TransactionType, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

function userId(req: Request) { return (req as AuthenticatedRequest).user?.id; }
const propertyTypes = new Set(Object.values(PropertyType));
const transactionTypes = new Set(Object.values(TransactionType));

/** Update/delete are scoped in SQL to the authenticated agent creator. */
export async function updateOwnAgentSearchRequestController(req: Request, res: Response) {
 try {
  const id = userId(req); if (!id) return res.status(401).json({ message: "Authentication required" });
  const { transactionType, propertyType, city, budget, description } = req.body ?? {};
  if ((transactionType !== undefined && !transactionTypes.has(transactionType)) || (propertyType !== undefined && !propertyTypes.has(propertyType)) || (city !== undefined && (typeof city !== "string" || !city.trim())) || (budget !== undefined && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) || (description !== undefined && description !== null && typeof description !== "string")) return res.status(400).json({ message: "Invalid search request data" });
  const existing = await prisma.propertySearchRequest.findFirst({ where: { id: req.params.requestId, createdByUserId: id, createdByRole: UserRole.AGENT } });
  if (!existing) return res.status(404).json({ message: "Search request not found or not owned by this agent" });
  const updated = await prisma.propertySearchRequest.update({ where: { id: existing.id }, data: { ...(transactionType !== undefined ? { transactionType } : {}), ...(propertyType !== undefined ? { propertyType } : {}), ...(city !== undefined ? { city: city.trim() } : {}), ...(budget !== undefined ? { budget } : {}), ...(description !== undefined ? { description } : {}) } });
  return res.status(200).json(updated);
 } catch (error) { console.error("Could not update agent search request:", error); return res.status(500).json({ message: "Internal server error" }); }
}

export async function deleteOwnAgentSearchRequestController(req: Request, res: Response) {
 try {
  const id = userId(req); if (!id) return res.status(401).json({ message: "Authentication required" });
  const result = await prisma.propertySearchRequest.deleteMany({ where: { id: req.params.requestId, createdByUserId: id, createdByRole: UserRole.AGENT } });
  if (!result.count) return res.status(404).json({ message: "Search request not found or not owned by this agent" });
  return res.status(204).send();
 } catch (error) { console.error("Could not delete agent search request:", error); return res.status(500).json({ message: "Internal server error" }); }
}