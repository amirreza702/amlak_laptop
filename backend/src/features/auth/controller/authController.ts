
import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";
import { writeAdminAuditLogBestEffort } from "../../hashti/service/adminAuditLogService";

import {
  loginUserService,
  registerUserService,
  logoutUserService,
  adminResetUserPasswordService,
  adminResetUserPasswordWithAuditService,
  listAdminUsersService,
} from "../service/authService";

/**
 * ثبت‌نام کاربر جدید
 * POST /auth/register
 */
export async function registerUserController(
  req: Request,
  res: Response
) {
  try {
    const { mobile, password, role, firstName, lastName } = req.body;

    if (
      typeof mobile !== "string" ||
      typeof password !== "string" ||
      typeof role !== "string" ||
      !mobile.trim() ||
      !password ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      !firstName.trim() ||
      !lastName.trim()
    ) {
      return res.status(400).json({
        message: "Mobile, password, role, firstName and lastName are required",
      });
    }

    const allowedRoles: UserRole[] = [
      UserRole.CUSTOMER,
      UserRole.OWNER,
      UserRole.AGENT,
    ];

    if (!allowedRoles.includes(role as UserRole)) {
      return res.status(400).json({
        message: "Invalid or unauthorized registration role",
      });
    }

    const user = await registerUserService({
      mobile: mobile.trim(),
      password,
      role: role as UserRole,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    return res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "USER_ALREADY_EXISTS") {
        return res.status(409).json({
          message: "This mobile number is already registered",
        });
      }

      
if (error.message === "INVALID_MOBILE") {
  return res.status(400).json({
    message: "Invalid Iranian mobile number",
  });
}

if (error.message === "PASSWORD_TOO_SHORT") {
  return res.status(400).json({
    message: "Password must be at least 8 characters long",
  });
}


      if (error.message === "ROLE_NOT_ALLOWED") {
        return res.status(403).json({
          message: "This role cannot be registered publicly",
        });
      }
    }

    console.error("Error registering user:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * ورود کاربر و ایجاد Session
 * POST /auth/login
 */
export async function loginUserController(
  req: Request,
  res: Response
) {
  try {
    const { mobile, password, expectedRole: requestedRole } = req.body;

    if (
      typeof mobile !== "string" ||
      typeof password !== "string" ||
      !mobile.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Mobile and password are required",
      });
    }

    const validRoles = Object.values(UserRole) as UserRole[];
    if (requestedRole !== undefined && (
      typeof requestedRole !== "string" ||
      !validRoles.includes(requestedRole as UserRole)
    )) {
      return res.status(400).json({
        message: "Invalid selected role",
      });
    }

    const result = await loginUserService(
      mobile.trim(),
      password,
      requestedRole as UserRole | undefined,
      req.cookies?.hashti_session
    );

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("hashti_session", result.sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });

    return res.status(200).json({
      message: "Login successful",
      user: result.user,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
          message: "Mobile number or password is incorrect",
        });
      }

      if (error.message === "ROLE_MISMATCH") {
        return res.status(403).json({
          message: "This account does not match the selected role",
        });
      }

      if (error.message === "USER_INACTIVE") {
        return res.status(403).json({
          message: "This account is inactive",
        });
      }
    }

    console.error("Error logging in:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * خروج کاربر و حذف Session فعلی
 * POST /auth/logout
 */
export async function logoutUserController(
  req: Request,
  res: Response
) {
  try {
    const sessionToken = req.cookies?.hashti_session;

    if (typeof sessionToken !== "string" || !sessionToken) {
      res.clearCookie("hashti_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return res.status(200).json({
        message: "Logged out successfully",
      });
    }

    await logoutUserService(sessionToken);

    res.clearCookie("hashti_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error: unknown) {
    console.error("Error logging out:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}


/**
 * بازنشانی رمز حساب کاربر توسط کارکنان هشتی
 * POST /auth/admin/users/:userId/reset-password
 */
export async function adminResetUserPasswordController(
  req: Request,
  res: Response
) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (
      typeof userId !== "string" ||
      !userId.trim() ||
      typeof newPassword !== "string" ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "User ID and new password are required",
      });
    }

    const resetActor = (req as AuthenticatedRequest).user;
    if (resetActor?.role === UserRole.HASHTI) {
      const reason = req.body?.reason;
      if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000) {
        return res.status(400).json({
          message: "A reset reason between 3 and 1000 characters is required",
        });
      }

      const user = await adminResetUserPasswordWithAuditService({
        userId,
        newPassword,
        actorUserId: resetActor.id,
        actorMobile: resetActor.mobile,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        reason: reason.trim(),
      });

      return res.status(200).json({
        message: "User password reset successfully",
        user,
      });
    }

    const user = await adminResetUserPasswordService(
      userId,
      newPassword
    );

    const actor = (req as AuthenticatedRequest).user;
    if (actor?.role === UserRole.HASHTI) {
      await writeAdminAuditLogBestEffort({
        actorUserId: actor.id,
        actorMobile: actor.mobile,
        actorRole: UserRole.HASHTI,
        action: "ADMIN_USER_PASSWORD_RESET",
        targetType: "USER",
        targetId: user.id,
        details: {
          targetMobile: user.mobile,
          targetRole: user.role,
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    return res.status(200).json({
      message: "User password reset successfully",
      user,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "CANNOT_RESET_OWN_PASSWORD") {
        return res.status(409).json({ message: "You cannot reset your own password through user management" });
      }

      if (error.message === "SUPER_ADMIN_PERMISSION_REQUIRED") {
        return res.status(403).json({ message: "Super-admin permission required" });
      }

      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (error.message === "PASSWORD_TOO_SHORT") {
        return res.status(400).json({
          message: "Password must be at least 8 characters long",
        });
      }

      if (error.message === "INVALID_USER_ID") {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }
    }

    console.error("Error resetting user password:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}



/**
 * جست‌وجو و فیلتر کاربران برای پنل مدیریت هشتی.
 * GET /auth/admin/users
 */
export async function listAdminUsersController(
  req: Request,
  res: Response
) {
  try {
    const rawSearch = req.query.search;
    const rawRole = req.query.role;
    const rawIsActive = req.query.isActive;
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;

    if (
      (rawSearch !== undefined && typeof rawSearch !== "string") ||
      (rawRole !== undefined && typeof rawRole !== "string") ||
      (rawIsActive !== undefined &&
        rawIsActive !== "true" &&
        rawIsActive !== "false") ||
      (rawPage !== undefined && typeof rawPage !== "string") ||
      (rawLimit !== undefined && typeof rawLimit !== "string")
    ) {
      return res.status(400).json({ message: "Invalid query parameters" });
    }

    const allowedRoles = Object.values(UserRole);
    if (
      typeof rawRole === "string" &&
      !allowedRoles.includes(rawRole as UserRole)
    ) {
      return res.status(400).json({ message: "Invalid user role filter" });
    }

    const page = rawPage === undefined ? 1 : Number(rawPage);
    const limit = rawLimit === undefined ? 20 : Number(rawLimit);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: "Page must be positive and limit must be between 1 and 100",
      });
    }

    const result = await listAdminUsersService({
      search: typeof rawSearch === "string" ? rawSearch.trim() : undefined,
      role: typeof rawRole === "string" ? rawRole as UserRole : undefined,
      isActive:
        rawIsActive === "true"
          ? true
          : rawIsActive === "false"
            ? false
            : undefined,
      page,
      limit,
    });

    return res.status(200).json({
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error listing admin users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
