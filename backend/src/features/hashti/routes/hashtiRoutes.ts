import { Router } from "express";
import { UserRole } from "@prisma/client";

import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import {
  getManagedAgentsController,
  setAgentVerificationController,
} from "../controller/agentManagementController";
import { getAdminAuditLogsController } from "../controller/adminAuditLogController";
import userManagementRoutes from "./userManagementRoutes";
import { getVerificationQueueController } from "../controller/verificationQueueController";
import { approveHashtiPropertyPublicationController, getHashtiPropertyRecordsController } from "../controller/propertyManagementController";

const router = Router();

// فهرست مشاوران برای مدیریت هشتی؛ پیش‌فرض فقط وضعیت PENDING است.
router.get(
  "/hashti/agents",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  getManagedAgentsController
);

// تأیید یا لغو تأیید مشاور؛ فقط نشست هشتی اجازه تغییر دارد.
router.patch(
  "/hashti/agents/:agentId/verification",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  setAgentVerificationController
);

// گزارش دسترسی به اطلاعات تماس مشتریان؛ اطلاعات شخصی فقط در اختیار هشتی است.

// گزارش عمومی رویدادهای مدیریتی ثبت‌شده؛ فقط برای کارکنان هشتی.
router.get(
  "/hashti/admin-audit-logs",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  getAdminAuditLogsController
);


router.get(
  "/hashti/properties",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  getHashtiPropertyRecordsController
);

// تأیید نهایی انتشار فقط توسط نقش هشتی انجام می‌شود.
router.patch(
  "/hashti/properties/:id/publish",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  approveHashtiPropertyPublicationController
);

router.get(
  "/hashti/verification-cases",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  getVerificationQueueController
);

router.use(userManagementRoutes);

export default router;
