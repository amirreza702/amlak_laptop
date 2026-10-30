import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  createCustomerSearchRequestController,
  createAgentSearchRequestController,
  getCustomerSearchRequestController,
  getCustomerSearchRequestsController,
  closeCustomerSearchRequestController,
  updateCustomerSearchRequestController,
  getActivePropertySearchRequestsController,
  getActivePropertySearchRequestByIdController,
} from "../controller/propertySearchRequestController";
import { getCurrentCustomerProfileController } from "../controller/currentCustomerProfileController";
import {
  getCustomerProfileController,
  updateCustomerProfileController,
} from "../controller/customerController";
import { authMiddleware } from "../../auth/middleware/authMiddleware";
import { requireRole } from "../../auth/middleware/requireRole";
import { requireOwnProfile, requireOwnSearchRequest } from "../../auth/middleware/authorizationMiddleware";
import { requireVerifiedAgent } from "../../auth/middleware/verifiedAgentMiddleware";

const router = Router();

// فقط پروفایل مشتری نشست فعلی؛ این مسیر باید پیش از :customerId باشد.
router.get(
  "/customers/me/profile",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  getCurrentCustomerProfileController
);

// پروفایل مشتری: فقط خود مشتری
router.get(
  "/customers/:customerId/profile",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  getCustomerProfileController
);
router.put(
  "/customers/:customerId/profile",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  updateCustomerProfileController
);

// ثبت درخواست توسط مشاور تأییدشده؛ اطلاعات ثبت‌کننده از نشست خوانده می‌شود.
router.post(
  "/agents/me/search-requests",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireVerifiedAgent,
  createAgentSearchRequestController
);

// ثبت درخواست مشتری بدون نیاز به ارسال شناسه پروفایل از فرانت‌اند.
router.post(
  "/customers/me/search-requests",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  createCustomerSearchRequestController
);

// مسیر قدیمی برای سازگاری؛ هویت همچنان از Session استخراج و بررسی می‌شود.
router.post(
  "/customers/:customerId/search-requests",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  createCustomerSearchRequestController
);
router.get(
  "/customers/:customerId/search-requests",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  getCustomerSearchRequestsController
);
router.get(
  "/customers/:customerId/search-requests/:requestId",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  requireOwnSearchRequest(),
  getCustomerSearchRequestController
);
router.put(
  "/customers/:customerId/search-requests/:requestId/close",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  requireOwnSearchRequest(),
  closeCustomerSearchRequestController
);
router.put(
  "/customers/:customerId/search-requests/:requestId",
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  requireOwnProfile("customer", "customerId"),
  requireOwnSearchRequest(),
  updateCustomerSearchRequestController
);

// درخواست‌های فعال برای مشاور تأییدشده؛ مشاهده تماس جداگانه ثبت می‌شود.
router.get(
  "/search-requests/active",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireVerifiedAgent,
  getActivePropertySearchRequestsController
);
router.get(
  "/search-requests/active/:requestId",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireVerifiedAgent,
  getActivePropertySearchRequestByIdController
);

export default router;
