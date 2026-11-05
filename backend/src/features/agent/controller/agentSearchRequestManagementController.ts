import { Request, Response } from "express";
import { PropertyType, TransactionType, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { authorize } from "../../../shared/authorization/authorization.core";

function userId(req: Request) { return (req as AuthenticatedRequest).user?.id; }
async function isVerifiedAgentUser(id: string): Promise<boolean> {
 const agent = await prisma.agent.findUnique({ where: { userId: id }, select: { verificationStatus: true } });
 return agent?.verificationStatus === "VERIFIED";
}
function routeParam(req: Request, key: string): string { const value = req.params[key]; return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
const propertyTypes = new Set(Object.values(PropertyType));
const transactionTypes = new Set(Object.values(TransactionType));

/** Update/delete are scoped in SQL to the authenticated agent creator. */
export async function updateOwnAgentSearchRequestController(req: Request, res: Response) {
 try {
  const id = userId(req); if (!id) return res.status(401).json({ message: "Authentication required" });
  const { transactionType, propertyType, city, budget, description, requesterFirstName, requesterLastName, requesterMobile } = req.body ?? {};
  if ((transactionType !== undefined && !transactionTypes.has(transactionType)) || (propertyType !== undefined && !propertyTypes.has(propertyType)) || (city !== undefined && (typeof city !== "string" || !city.trim())) || (budget !== undefined && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) || (description !== undefined && description !== null && typeof description !== "string") || (requesterFirstName !== undefined && requesterFirstName !== null && typeof requesterFirstName !== "string") || typeof requesterLastName !== "string" || !requesterLastName.trim() || typeof requesterMobile !== "string" || !requesterMobile.trim()) return res.status(400).json({ message: "نام خانوادگی و شماره تماس مشتری الزامی است." });
  const isVerifiedAgent = await isVerifiedAgentUser(id);
  if (!isVerifiedAgent) return res.status(403).json({ message: "Agent verification is required" });
  const existing = await prisma.propertySearchRequest.findFirst({ where: { id: routeParam(req, "requestId"), createdByUserId: id, createdByRole: UserRole.AGENT } });
  if (!existing) return res.status(404).json({ message: "Search request not found or not owned by this agent" });
  const allowed = await authorize("searchRequest", "MANAGE_OWN", {
   actor: { id, role: "AGENT" },
   resource: { id: existing.id, status: existing.status, data: { isCreator: existing.createdByUserId === id, createdByRole: existing.createdByRole, status: existing.status, isVerifiedAgent } },
  });
  if (!allowed) return res.status(403).json({ message: "Search request management denied" });
  const updated = await prisma.propertySearchRequest.update({ where: { id: existing.id }, data: { ...(transactionType !== undefined ? { transactionType } : {}), ...(propertyType !== undefined ? { propertyType } : {}), ...(city !== undefined ? { city: city.trim() } : {}), ...(budget !== undefined ? { budget } : {}), ...(description !== undefined ? { description } : {}), requesterFirstName: typeof requesterFirstName === "string" ? requesterFirstName.trim() || null : null, requesterLastName: requesterLastName.trim(), requesterMobile: requesterMobile.trim() } });
  return res.status(200).json(updated);
 } catch (error) { console.error("Could not update agent search request:", error); return res.status(500).json({ message: "Internal server error" }); }
}

export async function deleteOwnAgentSearchRequestController(req: Request, res: Response) {
 try {
  const id = userId(req); if (!id) return res.status(401).json({ message: "Authentication required" });
  const isVerifiedAgent = await isVerifiedAgentUser(id);
  if (!isVerifiedAgent) return res.status(403).json({ message: "Agent verification is required" });
  const existing = await prisma.propertySearchRequest.findFirst({ where: { id: routeParam(req, "requestId"), createdByUserId: id, createdByRole: UserRole.AGENT } });
  if (!existing) return res.status(404).json({ message: "Search request not found or not owned by this agent" });
  const allowed = await authorize("searchRequest", "MANAGE_OWN", {
   actor: { id, role: "AGENT" },
   resource: { id: existing.id, status: existing.status, data: { isCreator: existing.createdByUserId === id, createdByRole: existing.createdByRole, status: existing.status, isVerifiedAgent } },
  });
  if (!allowed) return res.status(403).json({ message: "Search request management denied" });
  const result = await prisma.propertySearchRequest.deleteMany({ where: { id: existing.id, createdByUserId: id, createdByRole: UserRole.AGENT } });
  if (!result.count) return res.status(404).json({ message: "Search request not found or not owned by this agent" });
  return res.status(204).send();
 } catch (error) { console.error("Could not delete agent search request:", error); return res.status(500).json({ message: "Internal server error" }); }
}
/** همه درخواست‌های جست‌وجو برای مشاور؛ بدون افشای شناسه داخلی ثبت‌کننده. */
export async function getAllAgentSearchRequestsController(req: Request, res: Response) {
 try {
  const id = userId(req); if (!id) return res.status(401).json({ message: "Authentication required" });
  const isVerifiedAgent = await isVerifiedAgentUser(id);
  const allowed = await authorize("searchRequest", "MARKETPLACE_LIST", {
   actor: { id, role: "AGENT" },
   resource: { status: "ACTIVE", data: { status: "ACTIVE", isVerifiedAgent } },
  });
  if (!allowed) return res.status(403).json({ message: "Search request marketplace access denied" });
  const rows = await prisma.propertySearchRequest.findMany({
   // در ابزار مدیریت مشتریان مشاور فقط درخواست‌های باز و فعال نمایش داده می‌شوند.
   where: { status: "ACTIVE" },
   select: {
    id: true, customerId: true, requesterMobile: true, requesterFirstName: true, requesterLastName: true,
    customer: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
    transactionType: true, propertyType: true, city: true, budget: true,
    description: true, hashtiVerified: true, status: true,
    createdByRole: true, createdByUserId: true,
    createdByUser: { select: { mobile: true, agent: { select: { firstName: true, lastName: true } } } },
    createdAt: true, updatedAt: true,
   },
   orderBy: { createdAt: "desc" },
  });
  return res.status(200).json(rows.map(({ createdByUserId, requesterMobile, requesterFirstName, requesterLastName, customer, createdByUser, ...request }) => {
   const isCreatedByMe = createdByUserId === id;
   const isAgentCreated = request.createdByRole === UserRole.AGENT;
   const mayViewCustomer = !isAgentCreated || isCreatedByMe;
   const customerFirstName = mayViewCustomer ? (requesterFirstName ?? customer?.firstName ?? null) : null;
   const customerLastName = mayViewCustomer ? (requesterLastName ?? customer?.lastName ?? null) : null;
   const customerMobile = mayViewCustomer ? (requesterMobile ?? customer?.user.mobile ?? null) : null;
   const creatorFirstName = createdByUser?.agent?.firstName ?? null;
   const creatorLastName = createdByUser?.agent?.lastName ?? null;
   const creatorMobile = isAgentCreated ? createdByUser?.mobile ?? null : customerMobile;
   const customerName = [customerFirstName, customerLastName].filter(Boolean).join(" ");
   const creatorName = [creatorFirstName, creatorLastName].filter(Boolean).join(" ");
   return {
    ...request,
    customerId: mayViewCustomer ? request.customerId : null,
    requesterFirstName: customerFirstName,
    requesterLastName: customerLastName,
    requesterMobile: customerMobile,
    contactName: isAgentCreated && !isCreatedByMe ? (creatorName || "مشاور ثبت‌کننده") : (customerName || "مشتری"),
    contactMobile: isAgentCreated && !isCreatedByMe ? creatorMobile : customerMobile,
    registrantFirstName: isAgentCreated ? creatorFirstName : customerFirstName,
    registrantLastName: isAgentCreated ? creatorLastName : customerLastName,
    registrantMobile: creatorMobile,
    isCreatedByMe,
   };
  }));
 } catch (error) { console.error("Could not list search requests for agent:", error); return res.status(500).json({ message: "Internal server error" }); }
}