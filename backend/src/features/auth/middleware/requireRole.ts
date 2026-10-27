
import {
  Request,
  Response,
  NextFunction,
} from "express";

import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "./authMiddleware";

/**
 * بررسی مجاز بودن نقش کاربر برای دسترسی به مسیر
 *
 * مثال:
 * router.post(
 *   "/owners/listings",
 *   authMiddleware,
 *   requireRole(UserRole.OWNER),
 *   controller
 * );
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const authenticatedReq = req as AuthenticatedRequest;
    const user = authenticatedReq.user;

    // ابتدا باید هویت کاربر تأیید شده باشد.
    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // نقش کاربر باید جزو نقش‌های مجاز باشد.
    if (!allowedRoles.includes(user.role as UserRole)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
      });
    }

    return next();
  };
}
