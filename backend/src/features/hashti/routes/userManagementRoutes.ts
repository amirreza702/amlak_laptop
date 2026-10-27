import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireSuperAdmin } from "../../auth/middleware/requireSuperAdmin";
import {
  createManagedHashtiUserController, getHashtiManagementAccessController, getManagedAuditLogsController,
  getManagedUsersController, setManagedUserStatusController, updateManagedProfileController,
} from "../controller/userManagementController";

const router = Router();

router.get("/hashti/management/access", authMiddleware, requireRole(UserRole.HASHTI), getHashtiManagementAccessController);
router.get("/hashti/management/users", authMiddleware, requireRole(UserRole.HASHTI), getManagedUsersController);
router.post("/hashti/management/staff", authMiddleware, requireSuperAdmin, createManagedHashtiUserController);
router.patch("/hashti/management/users/:userId/status", authMiddleware, requireRole(UserRole.HASHTI), setManagedUserStatusController);
router.patch("/hashti/management/profiles/:profileType/:profileId", authMiddleware, requireRole(UserRole.HASHTI), updateManagedProfileController);
router.get("/hashti/management/audit-logs", authMiddleware, requireRole(UserRole.HASHTI), getManagedAuditLogsController);

export default router;
