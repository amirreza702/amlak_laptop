import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  createCustomerSearchRequestController,
  getCustomerSearchRequestController,
  getCustomerSearchRequestsController,
  closeCustomerSearchRequestController,
  updateCustomerSearchRequestController,
  getActivePropertySearchRequestsController,
  getActivePropertySearchRequestByIdController,
} from "../controller/propertySearchRequestController";
import { getCurrentCustomerProfileController } from "../controller/currentCustomerProfileController";
import { accessCustomerContactController } from "../controller/contactAccessController";
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

// درخواست‌های جست‌وجو: فقط صاحب درخواست
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

// دسترسی مشاور تأییدشده به اطلاعات تماس؛ اشتراک و سهمیه شرط دسترسی نیستند.
router.post(
  "/agents/:agentId/search-requests/:searchRequestId/contact",
  authMiddleware,
  requireRole(UserRole.AGENT),
  requireOwnProfile("agent", "agentId"),
  requireVerifiedAgent,
  accessCustomerContactController
);

export default router;
