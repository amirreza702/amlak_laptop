import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireAdminPermission } from "../../admin/middleware/requireAdminPermission";
import {
  getHashtiManagementAccessController, getManagedAuditLogsController,
  getManagedUsersController, setManagedUserStatusController, updateManagedProfileController,
} from "../controller/userManagementController";

const router = Router();

router.get("/hashti/management/access", authMiddleware, requireRole(UserRole.HASHTI), getHashtiManagementAccessController);
router.get("/hashti/management/users", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("USERS_READ"), getManagedUsersController);
router.patch("/hashti/management/users/:userId/status", authMiddleware, requireRole(UserRole.HASHTI), setManagedUserStatusController);
router.patch(
  "/hashti/management/profiles/:profileType/:profileId",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  (req, res, next) => {
    const profileType = String(req.params.profileType ?? "").toUpperCase();
    const permission = profileType === "OWNER"
      ? "OWNERS_MANAGE"
      : profileType === "AGENT"
        ? "AGENTS_MANAGE"
        : "USERS_MANAGE";
    return requireAdminPermission(permission)(req, res, next);
  },
  updateManagedProfileController
);
router.get("/hashti/management/audit-logs", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AUDIT_READ"), getManagedAuditLogsController);

export default router;
