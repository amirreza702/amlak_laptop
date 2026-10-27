import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireAdminPermission } from "../middleware/requireAdminPermission";
import {
  bootstrapSuperAdminController, listUsersController, userDetailsController, setUserStatusController,
  listOwnersController, ownerDetailsController, listAgentsController, agentDetailsController,
  setAgentVerificationController, setAgentSubscriptionController, updateStaffPermissionsController,
  auditController, plansController, createStaffAccountController, ownerHistoryController, agentHistoryController, setOwnerStatusController, listStaffAccountsController, setAgentStatusController,
} from "../controller/adminController";

const router = Router();

// راه‌اندازی فقط با secret یک‌باره و فقط تا زمانی که حساب ارشد وجود ندارد.
router.post("/auth/admin/bootstrap", bootstrapSuperAdminController);

router.get("/admin/users", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("USERS_READ"), listUsersController);
router.get("/admin/users/:userId", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("USERS_READ"), userDetailsController);
router.patch("/admin/users/:userId/status", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("USERS_MANAGE"), setUserStatusController);

router.get("/admin/owners", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("OWNERS_MANAGE"), listOwnersController);
router.get("/admin/owners/:ownerId", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("OWNERS_MANAGE"), ownerDetailsController);
router.patch("/admin/owners/:ownerId/status", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("OWNERS_MANAGE"), setOwnerStatusController);
router.get("/admin/owners/:ownerId/history", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("OWNERS_MANAGE"), ownerHistoryController);

router.get("/admin/agents", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AGENTS_MANAGE"), listAgentsController);
router.get("/admin/agents/:agentId", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AGENTS_MANAGE"), agentDetailsController);
router.patch("/admin/agents/:agentId/status", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AGENTS_MANAGE"), setAgentStatusController);
router.patch("/admin/agents/:agentId/verification", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AGENTS_MANAGE"), setAgentVerificationController);
router.post("/admin/agents/:agentId/subscription", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AGENTS_MANAGE"), setAgentSubscriptionController);
router.get("/admin/agents/:agentId/history", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AGENTS_MANAGE"), agentHistoryController);
router.get("/admin/subscription-plans", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AGENTS_MANAGE"), plansController);

router.get("/admin/staff", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("STAFF_MANAGE"), listStaffAccountsController);
router.post("/admin/staff", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("STAFF_MANAGE"), createStaffAccountController);
router.patch("/admin/staff/:userId/permissions", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("STAFF_MANAGE"), updateStaffPermissionsController);
router.get("/admin/audit", authMiddleware, requireRole(UserRole.HASHTI), requireAdminPermission("AUDIT_READ"), auditController);

export default router;
