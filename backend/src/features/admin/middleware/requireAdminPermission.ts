import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AdminPermission } from "../repository/adminRepository";

/** Loads trusted staff account state, then delegates the decision to Authorization Core. */
export function requireAdminPermission(permission: AdminPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== UserRole.HASHTI) {
      return res.status(403).json({ message: "Hashti staff access required" });
    }

    try {
      const account = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
      });
      const allowed = account && account.role === UserRole.HASHTI
        ? await authorize("admin", "PERMISSION", {
            actor: { id: user.id, role: account.role, isActive: account.isActive },
            resource: {
              data: {
                isActive: account.isActive,
                isSuperAdmin: account.isSuperAdmin,
                permissions: account.adminPermissions,
              },
            },
            metadata: { permission },
          })
        : false;

      if (!allowed) {
        return res.status(403).json({
          message: account?.isActive === false
            ? "Account is inactive"
            : "You do not have the required admin permission",
        });
      }
      return next();
    } catch (error) {
      console.error("Admin permission authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
