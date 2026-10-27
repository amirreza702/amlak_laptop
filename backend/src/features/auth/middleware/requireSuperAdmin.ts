import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import type { AuthenticatedRequest } from "./authMiddleware";
import { prisma } from "../../../lib/prisma";

/**
 * Database-backed guard for account-management operations.
 * Permission is never trusted from request data.
 */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return res.status(401).json({ message: "Authentication required" });
  if (user.role !== UserRole.HASHTI) return res.status(403).json({ message: "Super-admin permission required" });

  try {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isActive: true, isSuperAdmin: true },
    });
    if (!current || current.role !== UserRole.HASHTI || !current.isActive || !current.isSuperAdmin) {
      return res.status(403).json({ message: "Super-admin permission required" });
    }
    return next();
  } catch (error) {
    console.error("Super-admin authorization failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
