import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import type { AdminPermission } from "../repository/adminRepository";

export function requireAdminPermission(permission: AdminPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== UserRole.HASHTI) return res.status(403).json({ message: "Hashti staff access required" });
    try {
      const account = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isActive: true, isSuperAdmin: true, adminPermissions: true },
      });
      if (!account?.isActive) return res.status(403).json({ message: "Account is inactive" });
      if (!account.isSuperAdmin && !account.adminPermissions.includes(permission)) {
        return res.status(403).json({ message: "You do not have the required admin permission" });
      }
      return next();
    } catch (error) {
      console.error("Admin permission check failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
