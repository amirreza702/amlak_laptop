import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import {
  bootstrapSuperAdmin, adminUsers, adminUserDetails, adminOwners, adminOwnerDetails,
  adminAgents, adminAgentDetails, adminSetUserStatus, adminSetAgentVerification,
  adminSetAgentSubscription, adminUpdateStaffPermissions, adminAudit, adminPlans, adminCreateStaffAccount, adminStaffAccounts,
} from "../service/adminService";

function actorId(req: Request) { return (req as AuthenticatedRequest).user?.id; }
function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function queryString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function queryBool(value: unknown): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
function pagination(req: Request) {
  return { page: req.query.page === undefined ? 1 : Number(req.query.page), limit: req.query.limit === undefined ? 20 : Number(req.query.limit) };
}
function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const known: Record<string, [number, string]> = {
    USER_NOT_FOUND: [404, "User not found"], OWNER_NOT_FOUND: [404, "Owner not found"], AGENT_NOT_FOUND: [404, "Agent not found"],
    SUBSCRIPTION_PLAN_NOT_FOUND: [404, "Subscription plan not found"], SUBSCRIPTION_PLAN_INACTIVE: [400, "Subscription plan is inactive"],
    INVALID_PAGINATION: [400, "Invalid page or limit"], INVALID_ROLE: [400, "Invalid role"], INVALID_MOBILE: [400, "Invalid Iranian mobile number"],
    PASSWORD_TOO_SHORT: [400, "Password must contain at least 12 characters"], REASON_REQUIRED: [400, "A reason of 3 to 1000 characters is required"],
    INVALID_SUBSCRIPTION_DATE: [400, "Invalid subscription dates"], INVALID_SUBSCRIPTION_STATUS: [400, "Invalid subscription status"],
    INVALID_PERMISSIONS: [400, "One or more permissions are invalid"], NOT_STAFF_ACCOUNT: [400, "Target account is not a Hashti staff account"],
    CANNOT_EDIT_SUPER_ADMIN: [403, "The super-admin account cannot be edited here"],
    CANNOT_EDIT_OWN_PERMISSIONS: [403, "Staff cannot change their own permissions"],
    SUPER_ADMIN_CANNOT_BE_DISABLED: [400, "The super-admin account cannot be disabled"],
    SUPER_ADMIN_ALREADY_EXISTS: [409, "The initial super-admin has already been created"],
    STAFF_MOBILE_EXISTS: [409, "A user with this mobile number already exists"],
    BOOTSTRAP_FORBIDDEN: [403, "Bootstrap secret is invalid or bootstrap is disabled"],
  };
  const found = known[message];
  if (found) return res.status(found[0]).json({ message: found[1] });
  console.error("Admin management request failed:", error);
  return res.status(500).json({ message: "Internal server error" });
}

export async function bootstrapSuperAdminController(req: Request, res: Response) {
  try {
    const user = await bootstrapSuperAdmin({ mobile: req.body?.mobile, password: req.body?.password, secret: req.body?.secret });
    return res.status(201).json({ message: "Initial super-admin created", user });
  } catch (error) { return sendError(res, error); }
}

export async function listUsersController(req: Request, res: Response) {
  try {
    const result = await adminUsers({ search: queryString(req.query.search), role: queryString(req.query.role), isActive: queryBool(req.query.isActive), ...pagination(req) });
    return res.status(200).json({ items: result.items, pagination: { ...pagination(req), total: result.total, totalPages: Math.ceil(result.total / pagination(req).limit) } });
  } catch (error) { return sendError(res, error); }
}
export async function userDetailsController(req: Request, res: Response) {
  try { return res.status(200).json({ item: await adminUserDetails(routeParam(req, "userId")) }); } catch (error) { return sendError(res, error); }
}
export async function setUserStatusController(req: Request, res: Response) {
  try {
    const actorUserId = actorId(req);
    if (!actorUserId) return res.status(401).json({ message: "Authentication required" });
    if (typeof req.body?.isActive !== "boolean") return res.status(400).json({ message: "isActive must be a boolean" });
    return res.status(200).json({ item: await adminSetUserStatus({ actorUserId, userId: routeParam(req, "userId"), isActive: req.body.isActive, reason: req.body.reason }) });
  } catch (error) { return sendError(res, error); }
}
export async function listOwnersController(req: Request, res: Response) {
  try {
    const result = await adminOwners({ search: queryString(req.query.search), isActive: queryBool(req.query.isActive), ...pagination(req) });
    return res.status(200).json({ items: result.items, pagination: { ...pagination(req), total: result.total, totalPages: Math.ceil(result.total / pagination(req).limit) } });
  } catch (error) { return sendError(res, error); }
}
export async function ownerDetailsController(req: Request, res: Response) {
  try { return res.status(200).json({ item: await adminOwnerDetails(routeParam(req, "ownerId")) }); } catch (error) { return sendError(res, error); }
}
export async function listAgentsController(req: Request, res: Response) {
  try {
    const result = await adminAgents({ search: queryString(req.query.search), isActive: queryBool(req.query.isActive), isVerified: queryBool(req.query.isVerified), subscriptionStatus: queryString(req.query.subscriptionStatus), ...pagination(req) });
    return res.status(200).json({ items: result.items, pagination: { ...pagination(req), total: result.total, totalPages: Math.ceil(result.total / pagination(req).limit) } });
  } catch (error) { return sendError(res, error); }
}
export async function agentDetailsController(req: Request, res: Response) {
  try { return res.status(200).json({ item: await adminAgentDetails(routeParam(req, "agentId")) }); } catch (error) { return sendError(res, error); }
}
export async function setAgentVerificationController(req: Request, res: Response) {
  try {
    const actorUserId = actorId(req);
    if (!actorUserId) return res.status(401).json({ message: "Authentication required" });
    if (typeof req.body?.isVerified !== "boolean") return res.status(400).json({ message: "isVerified must be a boolean" });
    return res.status(200).json({ item: await adminSetAgentVerification({ actorUserId, agentId: routeParam(req, "agentId"), isVerified: req.body.isVerified, reason: req.body.reason }) });
  } catch (error) { return sendError(res, error); }
}
export async function setAgentSubscriptionController(req: Request, res: Response) {
  try {
    const actorUserId = actorId(req);
    if (!actorUserId) return res.status(401).json({ message: "Authentication required" });
    const { planId, status, startsAt, expiresAt, reason } = req.body ?? {};
    if (typeof planId !== "string" || typeof status !== "string" || typeof startsAt !== "string") return res.status(400).json({ message: "planId, status and startsAt are required" });
    return res.status(201).json({ item: await adminSetAgentSubscription({ actorUserId, agentId: routeParam(req, "agentId"), planId, status, startsAt, expiresAt, reason }) });
  } catch (error) { return sendError(res, error); }
}
export async function updateStaffPermissionsController(req: Request, res: Response) {
  try {
    const actorUserId = actorId(req);
    if (!actorUserId) return res.status(401).json({ message: "Authentication required" });
    return res.status(200).json({ item: await adminUpdateStaffPermissions({ actorUserId, userId: routeParam(req, "userId"), permissions: req.body?.permissions, reason: req.body?.reason }) });
  } catch (error) { return sendError(res, error); }
}
export async function auditController(req: Request, res: Response) {
  try {
    const result = await adminAudit({ targetType: queryString(req.query.targetType), targetId: queryString(req.query.targetId), targetUserId: queryString(req.query.targetUserId), actorUserId: queryString(req.query.actorUserId), ...pagination(req) });
    return res.status(200).json({ items: result.items, pagination: { ...pagination(req), total: result.total, totalPages: Math.ceil(result.total / pagination(req).limit) } });
  } catch (error) { return sendError(res, error); }
}
export async function plansController(_req: Request, res: Response) {
  try { return res.status(200).json({ items: await adminPlans() }); } catch (error) { return sendError(res, error); }
}


export async function createStaffAccountController(req: Request, res: Response) {
  try {
    const actorUserId = actorId(req);
    if (!actorUserId) return res.status(401).json({ message: "Authentication required" });
    const item = await adminCreateStaffAccount({
      actorUserId, mobile: req.body?.mobile, password: req.body?.password,
      permissions: req.body?.permissions, reason: req.body?.reason,
    });
    return res.status(201).json({ item });
  } catch (error) { return sendError(res, error); }
}


export async function ownerHistoryController(req: Request, res: Response) {
  try {
    const owner = await adminOwnerDetails(routeParam(req, "ownerId"));
    const result = await adminAudit({ targetUserId: owner.user.id, ...pagination(req) });
    return res.status(200).json({ items: result.items, pagination: { ...pagination(req), total: result.total, totalPages: Math.ceil(result.total / pagination(req).limit) } });
  } catch (error) { return sendError(res, error); }
}

export async function agentHistoryController(req: Request, res: Response) {
  try {
    const agent = await adminAgentDetails(routeParam(req, "agentId"));
    const result = await adminAudit({ targetUserId: agent.user.id, ...pagination(req) });
    return res.status(200).json({ items: result.items, pagination: { ...pagination(req), total: result.total, totalPages: Math.ceil(result.total / pagination(req).limit) } });
  } catch (error) { return sendError(res, error); }
}


export async function setOwnerStatusController(req: Request, res: Response) {
  try {
    const actorUserId = actorId(req);
    if (!actorUserId) return res.status(401).json({ message: "Authentication required" });
    if (typeof req.body?.isActive !== "boolean") return res.status(400).json({ message: "isActive must be a boolean" });
    const owner = await adminOwnerDetails(routeParam(req, "ownerId"));
    const item = await adminSetUserStatus({ actorUserId, userId: owner.user.id, isActive: req.body.isActive, reason: req.body.reason });
    return res.status(200).json({ item });
  } catch (error) { return sendError(res, error); }
}


export async function listStaffAccountsController(_req: Request, res: Response) {
  try { return res.status(200).json({ items: await adminStaffAccounts() }); }
  catch (error) { return sendError(res, error); }
}


export async function setAgentStatusController(req: Request, res: Response) {
  try {
    const actorUserId = actorId(req);
    if (!actorUserId) return res.status(401).json({ message: "Authentication required" });
    if (typeof req.body?.isActive !== "boolean") return res.status(400).json({ message: "isActive must be a boolean" });
    const agent = await adminAgentDetails(routeParam(req, "agentId"));
    const item = await adminSetUserStatus({ actorUserId, userId: agent.user.id, isActive: req.body.isActive, reason: req.body.reason });
    return res.status(200).json({ item });
  } catch (error) { return sendError(res, error); }
}
