import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import type { AuthenticatedRequest } from "./authMiddleware";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";

/** Database-backed super-admin guard; the Core makes the final decision. */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return res.status(401).json({ message: "Authentication required" });
  if (user.role !== UserRole.HASHTI) return res.status(403).json({ message: "Super-admin permission required" });

  try {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isActive: true, isSuperAdmin: true },
    });
    if (!current || current.role !== UserRole.HASHTI || current.isActive !== true) {
      return res.status(403).json({ message: "Super-admin permission required" });
    }
    const allowed = await authorize("admin", "SUPER_ADMIN", {
      actor: { id: user.id, role: current.role, isActive: current.isActive },
      resource: { data: { isActive: current.isActive, isSuperAdmin: current.isSuperAdmin } },
    });
    if (!allowed) return res.status(403).json({ message: "Super-admin permission required" });
    return next();
  } catch (error) {
    console.error("Super-admin authorization failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
