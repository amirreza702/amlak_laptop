import { Router } from "express";
import {
  getUserNotificationsController,
  markNotificationAsReadController,
} from "../controller/notificationController";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireOwnNotification } from "../../auth/middleware/authorizationMiddleware";
import { requireOwnNotification, requireOwnNotificationUser } from "../../auth/middleware/authorizationMiddleware";

const router = Router();

// شناسه کاربر از نشست تعیین می‌شود؛ شناسه URL برای تعیین هویت معتبر نیست.
router.get(
  "/notifications/user/:userId",
  authMiddleware,
  requireOwnNotificationUser("userId"),
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
