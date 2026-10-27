import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  getAgentProfileController,
  getCurrentAgentProfileController,
  updateAgentProfileController,
} from "../controller/agentController";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireOwnProfile } from "../../auth/middleware/authorizationMiddleware";
import { requireVerifiedAgent } from "../../auth/middleware/verifiedAgentMiddleware";
import {
  accessOwnerRequestContactController,
  getActiveOwnerAgentRequestsController,
} from "../../owner/controller/ownerAgentRequestController";

const router = Router();

// شناسه پروفایل از User نشست استخراج می‌شود؛ به شناسه ذخیره‌شده در مرورگر وابسته نیست.
router.get(
  "/agents/me/profile",
  authMiddleware,
  requireRole(UserRole.AGENT),
  getCurrentAgentProfileController
);


router.get(
  "/agents/:agentId/profile",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireOwnProfile("agent", "agentId"),
  getAgentProfileController
);

router.put(
  "/agents/:agentId/profile",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireOwnProfile("agent", "agentId"),
  updateAgentProfileController
);

// Public request details omit owner contact and exact address until subscription access is granted.
router.get(
  "/agents/:agentId/owner-requests",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireOwnProfile("agent", "agentId"),
  requireVerifiedAgent,
  getActiveOwnerAgentRequestsController
);
router.post(
  "/agents/:agentId/owner-requests/:requestId/contact",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireOwnProfile("agent", "agentId"),
  requireVerifiedAgent,
  accessOwnerRequestContactController
);

export default router;
