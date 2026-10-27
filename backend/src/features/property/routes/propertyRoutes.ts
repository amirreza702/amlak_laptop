import { Router } from "express";
import { UserRole } from "@prisma/client";

import { getPropertyByIdController, registerPropertyController } from "../controller/propertyController";
import { getPublicPropertyByIdController } from "../controller/publicPropertyController";
import { searchPropertyController } from "../controller/propertySearchController";
import { createPropertyListingController } from "../controller/propertyListingController";
import { updatePropertyPriceController } from "../controller/propertyPriceController";
import { updatePropertyListingStatusController } from "../controller/propertyListingStatusController";
import { checkPropertyConfirmationController } from "../controller/propertyConfirmationController";
import { expirePropertyListingController } from "../controller/expirePropertyListingController";
import { addPropertyOwnerController } from "../controller/propertyOwnerController";
import { verifyPropertyOwnerController } from "../controller/propertyOwnerVerificationController";
import { approvePropertyAgentByOwnerController } from "../controller/propertyAgentApprovalController";
import { revokePropertyAgentController } from "../controller/propertyAgentRevocationController";
import { createVerificationCaseController, reviewVerificationCaseController } from "../controller/verificationCaseController";
import { createVerificationDocumentController, getVerificationDocumentsController } from "../controller/verificationDocumentController";
import { createPropertyMediaController, getPropertyMediaController } from "../controller/propertyMediaController";
import { createDuplicateReviewController, getDuplicateReviewsController, reviewDuplicateController } from "../controller/duplicateReviewController";
import { archivePropertyController, getPropertyArchiveController, restorePropertyController } from "../controller/propertyArchiveController";
import { createExactLocationAccessLogController, getExactLocationAccessLogsController } from "../controller/exactLocationAccessLogController";
import { updatePropertyController } from "../controller/propertyUpdateController";
import { findDuplicateMatchesController } from "../controller/duplicateMatchingController";

import { authMiddleware, type AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireVerifiedAgent } from "../../auth/middleware/verifiedAgentMiddleware";
import {
  bindOwnProfileIdToBody,
  requirePropertyAccess,
  requireVerificationCaseAccess,
} from "../../auth/middleware/authorizationMiddleware";

const router = Router();
const propertyManagers = [UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI] as const;
const propertyEditors = [UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI] as const;

// اطلاعات عمومی منتشرشده ملک و جست‌وجو عمومی باقی می‌مانند.
router.get("/properties/search", searchPropertyController);
router.get("/properties/:id/public", getPublicPropertyByIdController);
router.get(
  "/properties/:id",
  authMiddleware,
  requireRole(...propertyManagers),
  requireVerifiedAgent,
  requirePropertyAccess("id", false),
  getPropertyByIdController
);
router.get(
  "/properties/:id/media",
  authMiddleware,
  requireRole(...propertyManagers),
  requireVerifiedAgent,
  requirePropertyAccess("id", false),
  getPropertyMediaController
);

// ثبت ملک توسط مالک یا مشاور؛ شناسه پروفایل از نشست استخراج می‌شود.
router.post(
  "/properties",
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.AGENT),
  requireVerifiedAgent,
  (req, res, next) => {
    const role = (req as AuthenticatedRequest).user?.role;
    const bindProfile =
      role === UserRole.OWNER
        ? bindOwnProfileIdToBody("owner", "ownerId")
        : bindOwnProfileIdToBody("agent", "agentId");

    return bindProfile(req, res, next);
  },
  registerPropertyController
);

// ثبت اولیه معامله مجاز است تا پیش از تأیید مالکیت/نمایندگی، اطلاعات در وضعیت پیش‌انتشار ثبت شود.
// این استثنا فقط برای ساخت Listing است؛ قیمت‌گذاری، انتشار و ویرایش همچنان کنترل‌های سخت‌گیرانه خود را دارند.
router.post(
  "/properties/:id/listing",
  authMiddleware, requireRole(...propertyManagers), requireVerifiedAgent,
  requirePropertyAccess("id", false, false),
  createPropertyListingController
);
router.put(
  "/properties/:id/price",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyAccess(),
  updatePropertyPriceController
);
router.put(
  "/properties/:id/status",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyAccess(),
  updatePropertyListingStatusController
);
router.get(
  "/properties/:id/confirmation",
  authMiddleware, requireRole(...propertyManagers), requireVerifiedAgent, requirePropertyAccess(),
  checkPropertyConfirmationController
);
router.put(
  "/properties/:id/expire",
  authMiddleware, requireRole(UserRole.HASHTI), expirePropertyListingController
);
router.patch(
  "/properties/:id",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyAccess(),
  updatePropertyController
);

// ایجاد رابطه مالکیت و تغییر وضعیت تأیید مالک، عملیات حساس کارکنان هشتی است.
router.post(
  "/properties/:id/owners",
  authMiddleware, requireRole(UserRole.HASHTI),
  addPropertyOwnerController
);
router.patch(
  "/properties/:id/owners/:ownerId/verification",
  authMiddleware, requireRole(UserRole.HASHTI),
  verifyPropertyOwnerController
);

// تصمیم درباره نمایندگی ملک فقط با نشست مالک همان ملک انجام می‌شود.
router.patch(
  "/properties/:id/agents/:agentId/approval",
  authMiddleware,
  requireRole(UserRole.OWNER),
  bindOwnProfileIdToBody("owner", "ownerId"),
  requirePropertyAccess(),
  approvePropertyAgentByOwnerController
);
router.patch(
  "/properties/:id/agents/:agentId/revoke",
  authMiddleware,
  requireRole(UserRole.OWNER),
  bindOwnProfileIdToBody("owner", "ownerId"),
  requirePropertyAccess(),
  revokePropertyAgentController
);

// رسانه فقط توسط مالک/مشاور مرتبط یا کارکنان هشتی قابل افزودن است.
router.post(
  "/properties/:id/media",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyAccess(),
  createPropertyMediaController
);

// پرونده تأیید و مدارک آن: فقط طرف مرتبط با ملک یا کارکنان هشتی.
router.post(
  "/properties/:id/verification",
  authMiddleware, requireRole(...propertyManagers), requireVerifiedAgent, requirePropertyAccess("id", false),
  createVerificationCaseController
);
router.post(
  "/verification-cases/:id/documents",
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI),
  requireVerifiedAgent,
  requireVerificationCaseAccess(),
  createVerificationDocumentController
);
router.get(
  "/verification-cases/:id/documents",
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI),
  requireVerifiedAgent,
  requireVerificationCaseAccess(),
  getVerificationDocumentsController
);
router.patch(
  "/verification-cases/:id/review",
  authMiddleware, requireRole(UserRole.HASHTI),
  reviewVerificationCaseController
);

// بررسی‌های Duplicate و تصمیم نهایی محرمانه و در اختیار هشتی است.
router.post(
  "/properties/:id/duplicate-reviews",
  authMiddleware, requireRole(UserRole.HASHTI), requirePropertyAccess(),
  createDuplicateReviewController
);
router.get(
  "/properties/:id/duplicate-reviews",
  authMiddleware, requireRole(UserRole.HASHTI), requirePropertyAccess(),
  getDuplicateReviewsController
);
router.patch(
  "/duplicate-reviews/:id/review",
  authMiddleware, requireRole(UserRole.HASHTI),
  reviewDuplicateController
);
router.get(
  "/properties/:id/duplicate-matches",
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI),
  requireVerifiedAgent,
  requirePropertyAccess(),
  findDuplicateMatchesController
);

// آرشیو و بازیابی فقط برای مالک مرتبط یا کارکنان هشتی.
router.patch(
  "/properties/:id/archive",
  authMiddleware, requireRole(UserRole.OWNER, UserRole.HASHTI), requirePropertyAccess(),
  archivePropertyController
);
router.get(
  "/properties/:id/archive",
  authMiddleware, requireRole(UserRole.OWNER, UserRole.HASHTI), requirePropertyAccess(),
  getPropertyArchiveController
);
router.patch(
  "/properties/:id/restore",
  authMiddleware, requireRole(UserRole.OWNER, UserRole.HASHTI), requirePropertyAccess(),
  restorePropertyController
);

// موقعیت دقیق و سوابق دسترسی فقط پس از احراز هویت و بررسی رابطه با ملک.
router.post(
  "/properties/:id/exact-location-access-logs",
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI),
  requireVerifiedAgent,
  requirePropertyAccess(),
  (req, res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });
    req.body = { ...(req.body ?? {}), userId: user.id };
    return next();
  },
  createExactLocationAccessLogController
);
router.get(
  "/properties/:id/exact-location-access-logs",
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI),
  requireVerifiedAgent,
  requirePropertyAccess(),
  getExactLocationAccessLogsController
);

export default router;
