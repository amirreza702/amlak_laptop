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
import { renewPropertyListingController } from "../controller/renewPropertyListingController";
import { addPropertyOwnerController } from "../controller/propertyOwnerController";
import { verifyPropertyOwnerController } from "../controller/propertyOwnerVerificationController";
import { approvePropertyAgentByOwnerController } from "../controller/propertyAgentApprovalController";
import { revokePropertyAgentController } from "../controller/propertyAgentRevocationController";
import { createPropertyMediaController, getPropertyMediaController, getPublicPropertyMediaContentController, getPrivatePropertyMediaContentController, deletePropertyMediaController, reorderPropertyMediaController } from "../controller/propertyMediaController";
import { createDuplicateReviewController, getDuplicateReviewsController, reviewDuplicateController } from "../controller/duplicateReviewController";
import { archivePropertyController, getPropertyArchiveController, restorePropertyController } from "../controller/propertyArchiveController";
import { createExactLocationAccessLogController, getExactLocationAccessLogsController } from "../controller/exactLocationAccessLogController";
import { updatePropertyController } from "../controller/propertyUpdateController";
import { deleteOwnPropertyController, deleteAgentManagedOwnerPropertyController, reactivateOwnPropertyController } from "../controller/propertyOwnerDeleteController";
import { findDuplicateMatchesController } from "../controller/duplicateMatchingController";

import { authMiddleware, optionalAuthMiddleware, type AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireVerifiedAgent } from "../../auth/middleware/verifiedAgentMiddleware";
import {
  bindOwnProfileIdToBody,
  requirePropertyAccess,
  requirePropertyCreator,
  requirePropertyCreatorOrAccess,
} from "../../auth/middleware/authorizationMiddleware";

const router = Router();
const propertyManagers = [UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI] as const;
const propertyEditors = [UserRole.OWNER, UserRole.AGENT, UserRole.HASHTI] as const;

// اطلاعات عمومی منتشرشده ملک و جست‌وجو عمومی باقی می‌مانند.
router.get("/properties/search", searchPropertyController);
router.delete("/agents/me/properties/:id", authMiddleware, requireRole(UserRole.AGENT), requireVerifiedAgent, requirePropertyAccess("id", false, true, true), deleteAgentManagedOwnerPropertyController);
router.get("/properties/:id/public", optionalAuthMiddleware, getPublicPropertyByIdController);
router.get(
  "/properties/:id",
  authMiddleware,
  requireRole(...propertyManagers),
  requireVerifiedAgent,
  requirePropertyCreatorOrAccess("id"),
  getPropertyByIdController
);
router.get(
  "/properties/:id/media",
  authMiddleware,
  requireRole(...propertyManagers),
  requireVerifiedAgent,
  requirePropertyCreatorOrAccess("id"),
  getPropertyMediaController
);

// پیش‌نمایش خصوصی تصاویر برای مالک/مشاور مجاز و هشتی؛ مستقل از انتشار عمومی.
router.get(
  "/properties/:id/media/:mediaId/content",
  authMiddleware,
  requireRole(...propertyManagers),
  requireVerifiedAgent,
  requirePropertyCreatorOrAccess("id"),
  getPrivatePropertyMediaContentController
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
  requirePropertyCreator(),
  createPropertyListingController
);
router.put(
  "/properties/:id/price",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyCreator(),
  updatePropertyPriceController
);
router.put(
  "/properties/:id/status",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyCreator(),
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
// مالک فقط می‌تواند ملک متعلق به حساب خودش را به‌صورت امن از فهرست فعال حذف کند.
router.delete(
  "/properties/:id",
  authMiddleware,
  requireRole(UserRole.OWNER),
  deleteOwnPropertyController
);

// فعال‌سازی مجدد فقط برای مالک ثبت‌شده همان ملک.
router.patch(
  "/properties/:id/activate",
  authMiddleware,
  requireRole(UserRole.OWNER),
  reactivateOwnPropertyController
);

// تمدید آگهی منقضی‌شده فقط برای مالک مرتبط یا مشاور دارای تأیید نهایی مالک.
router.patch(
  "/properties/:id/renew",
  authMiddleware,
  requireRole(UserRole.OWNER, UserRole.AGENT),
  requireVerifiedAgent,
  requirePropertyAccess("id", false, true, false),
  renewPropertyListingController
);

router.patch(
  "/properties/:id",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyCreator(),
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
  requirePropertyAccess("id", false),
  approvePropertyAgentByOwnerController
);
router.patch(
  "/properties/:id/agents/:agentId/revoke",
  authMiddleware,
  requireRole(UserRole.OWNER),
  bindOwnProfileIdToBody("owner", "ownerId"),
  // فقط وجود رابطه مالکیت در middleware بررسی می‌شود؛
  // تأیید هشتی برای مالک شرط لغو همکاری نیست.
  requirePropertyAccess("id", false),
  revokePropertyAgentController
);

router.delete("/properties/:id/media/:mediaId", authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyCreator(), deletePropertyMediaController);
router.patch("/properties/:id/media/order", authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyCreator(), reorderPropertyMediaController);

// رسانه فقط توسط مالک/مشاور مرتبط یا کارکنان هشتی قابل افزودن است.
router.post(
  "/properties/:id/media",
  authMiddleware, requireRole(...propertyEditors), requireVerifiedAgent, requirePropertyCreator(),
  createPropertyMediaController
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
