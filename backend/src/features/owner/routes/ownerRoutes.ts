import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  getOwnerProfileController,
  getCurrentOwnerProfileController,
  getCurrentOwnerPropertiesController,
  updateCurrentOwnerProfileController,
  getOwnerPropertiesController,
  updateOwnerProfileController,
} from "../controller/ownerController";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireOwnProfile } from "../../auth/middleware/authorizationMiddleware";
import {
  closeOwnerAgentRequestController,
  createOwnerAgentRequestController,
  getOwnerAgentRequestsController,
} from "../controller/ownerAgentRequestController";

const router = Router();

// مسیرهای /me قبل از مسیرهای پارامتری تعریف می‌شوند و شناسه را از نشست می‌گیرند.
router.get(
  "/owners/me/profile",
  authMiddleware,
  requireRole(UserRole.OWNER),
  getCurrentOwnerProfileController
);

router.put(
  "/owners/me/profile",
  authMiddleware,
  requireRole(UserRole.OWNER),
  updateCurrentOwnerProfileController
);

router.get(
  "/owners/me/properties",
  authMiddleware,
  requireRole(UserRole.OWNER),
  getCurrentOwnerPropertiesController
);

// فقط مالک واردشده می‌تواند پروفایل متعلق به خودش را بخواند یا تغییر دهد.
router.get(
  "/owners/:ownerId/profile",
  authMiddleware,
  requireRole(UserRole.OWNER),
  requireOwnProfile("owner", "ownerId"),
  getOwnerProfileController
);

router.put(
  "/owners/:ownerId/profile",
  authMiddleware,
  requireRole(UserRole.OWNER),
  requireOwnProfile("owner", "ownerId"),
  updateOwnerProfileController
);


router.get(
  "/owners/:ownerId/properties",
  authMiddleware,
  requireRole(UserRole.OWNER),
  requireOwnProfile("owner", "ownerId"),
  getOwnerPropertiesController
);

// Requests for an agent to serve a property are owned and managed by the owner.
router.post(
  "/owners/:ownerId/agent-requests",
  authMiddleware,
  requireRole(UserRole.OWNER),
  requireOwnProfile("owner", "ownerId"),
  createOwnerAgentRequestController
);
router.get(
  "/owners/:ownerId/agent-requests",
  authMiddleware,
  requireRole(UserRole.OWNER),
  requireOwnProfile("owner", "ownerId"),
  getOwnerAgentRequestsController
);
router.put(
  "/owners/:ownerId/agent-requests/:requestId/close",
  authMiddleware,
  requireRole(UserRole.OWNER),
  requireOwnProfile("owner", "ownerId"),
  closeOwnerAgentRequestController
);

export default router;
