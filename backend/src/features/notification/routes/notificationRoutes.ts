import { Router } from "express";
import {
  getUserNotificationsController,
  markNotificationAsReadController,
} from "../controller/notificationController";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireOwnNotification } from "../../auth/middleware/authorizationMiddleware";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

const router = Router();

// شناسه کاربر از نشست تعیین می‌شود؛ شناسه URL برای تعیین هویت معتبر نیست.
router.get(
  "/notifications/user/:userId",
  authMiddleware,
  (req, res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });
    if (req.params.userId !== user.id) {
      return res.status(403).json({ message: "You cannot access another user's notifications" });
    }
    return next();
  },
  getUserNotificationsController
);

router.patch(
  "/notifications/:id/read",
  authMiddleware,
  requireOwnNotification("id"),
  (req, res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });
    req.body = { ...(req.body ?? {}), userId: user.id };
    return next();
  },
  markNotificationAsReadController
);

export default router;
