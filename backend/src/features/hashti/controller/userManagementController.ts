import type { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { getAdminAuditLogsService } from "../service/adminAuditLogService";
import type { AdminAuditLogQuery } from "../repository/adminAuditLogRepository";
import {
  createManagedHashtiUserService, getManagedUsersService, getSuperAdminAccessService,
  setManagedUserStatusService, updateManagedProfileService,
} from "../service/userManagementService";
import type { ManagedProfileType } from "../repository/userManagementRepository";

function getActor(req: Request) { return (req as AuthenticatedRequest).user; }
function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function parseIntegerQuery(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
function readReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return reason.length >= 3 && reason.length <= 1000 ? reason : null;
}

export async function getHashtiManagementAccessController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  try {
    return res.status(200).json({ isSuperAdmin: await getSuperAdminAccessService(actor.id) });
  } catch (error) {
    console.error("Failed to check Hashti management access:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getManagedUsersController(req: Request, res: Response) {
  const rawRole = req.query.role;
  const role = typeof rawRole === "string" ? rawRole.trim().toUpperCase() : "";
  if (role && !Object.values(UserRole).includes(role as UserRole)) return res.status(400).json({ message: "Invalid role filter" });

  let isActive: boolean | undefined;
  if (req.query.active !== undefined) {
    if (req.query.active !== "true" && req.query.active !== "false") return res.status(400).json({ message: "active must be true or false" });
    isActive = req.query.active === "true";
  }
  if (req.query.query !== undefined && (typeof req.query.query !== "string" || req.query.query.length > 200)) {
    return res.status(400).json({ message: "query must be a string up to 200 characters" });
  }
  const limit = parseIntegerQuery(req.query.limit, 25, 1, 100);
  const offset = parseIntegerQuery(req.query.offset, 0, 0, 1_000_000);
  if (limit === null || offset === null) return res.status(400).json({ message: "Invalid pagination parameters" });

  try {
    const result = await getManagedUsersService({
      query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
      role: role ? role as UserRole : undefined, isActive, limit, offset,
    });
    return res.status(200).json({ users: result.users, pagination: { total: result.total, limit, offset } });
  } catch (error) {
    console.error("Failed to list managed users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function setManagedUserStatusController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  const isActive = req.body?.isActive;
  const reason = readReason(req.body?.reason);
  if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive must be boolean" });
  if (!reason) return res.status(400).json({ message: "A change reason of 3 to 1000 characters is required" });

  try {
    const result = await setManagedUserStatusService({
      userId: routeParam(req, "userId"), isActive, reason, actorUserId: actor.id, actorMobile: actor.mobile,
    });
    return res.status(200).json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "HASHTI_PERMISSION_REQUIRED" || code === "SUPER_ADMIN_PERMISSION_REQUIRED") return res.status(403).json({ message: "You do not have permission to manage this account" });
    if (code === "USER_NOT_FOUND") return res.status(404).json({ message: "User not found" });
    if (code === "CANNOT_CHANGE_OWN_STATUS") return res.status(409).json({ message: "You cannot change your own account status" });
    if (code === "LAST_SUPER_ADMIN_REQUIRED") return res.status(409).json({ message: "At least one active super admin must remain" });
    console.error("Failed to change managed user status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createManagedHashtiUserController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  const { mobile, firstName, lastName, password } = req.body ?? {};
  if (
    typeof mobile !== "string" || !/^09\d{9}$/.test(mobile.trim()) ||
    typeof firstName !== "string" || !firstName.trim() || firstName.trim().length > 120 ||
    typeof lastName !== "string" || !lastName.trim() || lastName.trim().length > 120 ||
    typeof password !== "string" || password.length < 12 || password.length > 200
  ) return res.status(400).json({ message: "Provide valid mobile, names, and a password between 12 and 200 characters" });

  try {
    const result = await createManagedHashtiUserService({
      mobile: mobile.trim(), firstName: firstName.trim(), lastName: lastName.trim(), password,
      actorUserId: actor.id, actorMobile: actor.mobile,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "SUPER_ADMIN_PERMISSION_REQUIRED") return res.status(403).json({ message: "Super-admin permission required" });
    if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") return res.status(409).json({ message: "This mobile number already belongs to a user" });
    console.error("Failed to create Hashti staff account:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateManagedProfileController(req: Request, res: Response) {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  const profileType = routeParam(req, "profileType");
  if (!["customer", "owner", "agent", "hashti"].includes(profileType)) return res.status(400).json({ message: "profileType must be customer, owner, agent, or hashti" });

  const { firstName, lastName, agencyName, address } = req.body ?? {};
  const reason = readReason(req.body?.reason);
  if (
    typeof firstName !== "string" || !firstName.trim() || firstName.trim().length > 120 ||
    typeof lastName !== "string" || !lastName.trim() || lastName.trim().length > 120 || !reason
  ) return res.status(400).json({ message: "Valid first name, last name, and change reason are required" });
  if (profileType === "agent" && (
    (agencyName !== undefined && agencyName !== null && (typeof agencyName !== "string" || agencyName.length > 200)) ||
    (address !== undefined && address !== null && (typeof address !== "string" || address.length > 500))
  )) return res.status(400).json({ message: "Invalid agency name or address" });

  try {
    const profile = await updateManagedProfileService({
      profileType: profileType as ManagedProfileType, profileId: routeParam(req, "profileId"),
      firstName: firstName.trim(), lastName: lastName.trim(),
      ...(profileType === "agent" && agencyName !== undefined ? { agencyName: typeof agencyName === "string" ? agencyName.trim() || null : null } : {}),
      ...(profileType === "agent" && address !== undefined ? { address: typeof address === "string" ? address.trim() || null : null } : {}),
      reason, actorUserId: actor.id, actorMobile: actor.mobile,
    });
    return res.status(200).json({ profile });
  } catch (error) {
    if (error instanceof Error && (error.message === "HASHTI_PERMISSION_REQUIRED" || error.message === "SUPER_ADMIN_PERMISSION_REQUIRED")) return res.status(403).json({ message: "You do not have permission to manage this profile" });
    if (error instanceof Error && error.message === "PROFILE_NOT_FOUND") return res.status(404).json({ message: "Profile not found" });
    console.error("Failed to update managed profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getManagedAuditLogsController(req: Request, res: Response) {
  const limit = parseIntegerQuery(req.query.limit, 20, 1, 100);
  const offset = parseIntegerQuery(req.query.offset, 0, 0, 1_000_000);
  if (limit === null || offset === null) return res.status(400).json({ message: "Invalid pagination parameters" });
  const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
  const targetType = typeof req.query.targetType === "string" ? req.query.targetType.trim() : "";
  const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
  if (targetId.length > 200 || targetType.length > 100 || action.length > 100) return res.status(400).json({ message: "Invalid audit log filter" });

  const query: AdminAuditLogQuery = {
    ...(targetId ? { targetId } : {}), ...(targetType ? { targetType } : {}), ...(action ? { action } : {}),
    limit, offset,
  };
  try {
    const result = await getAdminAuditLogsService(query);
    return res.status(200).json({ logs: result.logs, pagination: { total: result.total, limit, offset } });
  } catch (error) {
    console.error("Failed to get managed user history:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
