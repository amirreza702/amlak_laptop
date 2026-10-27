
import { Router } from "express";
import { UserRole } from "@prisma/client";

import {
  registerUserController,
  loginUserController,
  logoutUserController,
  adminResetUserPasswordController,
  listAdminUsersController,
} from "../controller/authController";

import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/requireRole";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin";
import { requireAdminPermission } from "../../admin/middleware/requireAdminPermission";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";

const router = Router();

// ثبت‌نام کاربر جدید
router.post("/auth/register", registerUserController);

// ورود کاربر و ایجاد Session
router.post("/auth/login", loginUserController);

// دریافت اطلاعات کاربر واردشده
router.get("/auth/me", authMiddleware, (req, res) => {
  const authenticatedRequest = req as AuthenticatedRequest;

  res.status(200).json({
    user: authenticatedRequest.user,
  });
});

// خروج کاربر و حذف نشست فعلی
router.post("/auth/logout", logoutUserController);

// فهرست کاربران برای پنل مدیریت هشتی؛ دسترسی بر اساس مجوز کنترل می‌شود.
router.get(
  "/auth/admin/users",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  requireAdminPermission("USERS_READ"),
  listAdminUsersController
);

// بازنشانی مدیریتی رمز حساب کاربر؛ فقط مدیر ارشد هشتی
router.post(
  "/auth/admin/users/:userId/reset-password",
  authMiddleware,
  requireRole(UserRole.HASHTI),
  requireSuperAdmin,
  adminResetUserPasswordController
);

// تغییر رمز شخصی با OTP در آینده پیاده‌سازی خواهد شد.
// فعلاً هیچ endpoint فعالی برای این قابلیت تعریف نمی‌شود.

export default router;
