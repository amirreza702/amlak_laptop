import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "./authMiddleware";
import { authorize } from "../../../shared/authorization/authorization.core";

/** Route role gates are decisions of the shared Authorization Core. */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const allowed = await authorize("roleAccess", "ALLOW", {
        actor: { id: user.id, role: user.role, isActive: user.isActive },
        metadata: { allowedRoles },
      });
      if (!allowed) {
        return res.status(403).json({
          message: "You do not have permission to access this resource",
        });
      }
      return next();
    } catch (error) {
      console.error("Central role authorization failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
