
import bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { UserRole } from "@prisma/client";

import {
  createSession,
  createUser,
  findUserByMobile,
  findSessionByTokenHash,
  extendSessionExpiry,
  deleteSessionByTokenHash,
  resetUserPasswordAndSessions,
  resetUserPasswordAndSessionsWithAudit,
  listAdminUsers,
} from "../repository/authRepository";

interface RegisterInput {
  mobile: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

/**
 * تبدیل توکن Session به هش SHA-256
 */
const hashSessionToken = (sessionToken: string) =>
  createHash("sha256").update(sessionToken).digest("hex");

// نشست پس از یک ساعت بدون درخواست معتبر منقضی می‌شود.
const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

/**
 * ثبت‌نام کاربر جدید
 */
export const registerUserService = async ({
  mobile,
  password,
  role,
  firstName,
  lastName,
}: RegisterInput) => {
  // نقش کارکنان هشتی نباید ثبت‌نام عمومی داشته باشد.
  if (role === UserRole.HASHTI) {
    throw new Error("ROLE_NOT_ALLOWED");
  }

  
  // قواعد کسب‌وکار ثبت‌نام

  // نام و نام خانوادگی برای ساخت پروفایل نقش‌محور لازم‌اند.
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  if (!normalizedFirstName || !normalizedLastName) {
    throw new Error("PROFILE_NAME_REQUIRED");
  }

  // شماره موبایل باید در قالب شماره موبایل ایران باشد.
  const normalizedMobile = mobile.trim();

  if (!/^09\d{9}$/.test(normalizedMobile)) {
    throw new Error("INVALID_MOBILE");
  }

  // رمز عبور باید حداقل ۸ کاراکتر داشته باشد.
  if (password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }


  const existingUser = await findUserByMobile(normalizedMobile);

  if (existingUser) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return createUser({
    mobile:normalizedMobile,
    passwordHash,
    role,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
  });
};

/**
 * ورود کاربر و ایجاد Session سمت سرور
 */
export const loginUserService = async (
  mobile: string,
  password: string,
  expectedRole?: UserRole,
  previousSessionToken?: string
) => {
  const user = await findUserByMobile(mobile);

  if (!user || !user.passwordHash) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordIsValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordIsValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("USER_INACTIVE");
  }

  // نقش انتخاب‌شده در رابط باید با نقش واقعی حساب یکسان باشد.
  if (expectedRole && user.role !== expectedRole) {
    throw new Error("ROLE_MISMATCH");
  }

  // فقط پس از تأیید رمز، فعال‌بودن حساب و تطابق نقش، نشست قبلی همین مرورگر باطل می‌شود.
  if (typeof previousSessionToken === "string" && previousSessionToken) {
    await deleteSessionByTokenHash(hashSessionToken(previousSessionToken));
  }

  // توکن تصادفی برای Session
  // پیشوند نسخه‌ای باعث می‌شود نشست‌های قدیمی با مهلت هفت‌روزه پذیرفته نشوند.
  const sessionToken = `h1_${randomBytes(32).toString("hex")}`;

  // فقط هش توکن در دیتابیس ذخیره می‌شود.
  const tokenHash = hashSessionToken(sessionToken);

  const expiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);

  await createSession({
    tokenHash,
    userId: user.id,
    expiresAt,
  });

  return {
    sessionToken,
    expiresAt,
    user: {
      id: user.id,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  };
};

/**
 * اعتبارسنجی Session و شناسایی کاربر
 */
export const getAuthenticatedUserService = async (
  sessionToken: string
) => {
  // نشست‌های صادرشده با نسخه قبلی، زمان آخرین فعالیت ثبت‌شده ندارند؛
  // برای اعمال دقیق مهلت عدم فعالیت، کاربر باید یک بار دوباره وارد شود.
  if (!sessionToken.startsWith("h1_")) {
    throw new Error("SESSION_EXPIRED");
  }

  const tokenHash = hashSessionToken(sessionToken);
  const session = await findSessionByTokenHash(tokenHash);

  if (!session) {
    throw new Error("SESSION_INVALID");
  }

  const now = new Date();
  if (session.expiresAt <= now) {
    throw new Error("SESSION_EXPIRED");
  }

  if (!session.user.isActive) {
    throw new Error("USER_INACTIVE");
  }

  // هر درخواست احراز‌شده، مهلت نشست را یک ساعت از نو تمدید می‌کند.
  const expiresAt = new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS);
  const extended = await extendSessionExpiry(tokenHash, now, expiresAt);

  // اگر نشست هم‌زمان حذف یا منقضی شده باشد، ادامه درخواست مجاز نیست.
  if (!extended) {
    throw new Error("SESSION_EXPIRED");
  }

  return {
    id: session.user.id,
    mobile: session.user.mobile,
    role: session.user.role,
    expiresAt,
  };
};

/**
 * خروج کاربر و حذف فقط Session فعلی
 */
export const logoutUserService = async (
  sessionToken: string
) => {
  const tokenHash = hashSessionToken(sessionToken);

  await deleteSessionByTokenHash(tokenHash);
};


/**
 * بازنشانی مدیریتی رمز عبور توسط کارکنان هشتی
 *
 * این تابع فقط هش رمز را دریافت می‌کند.
 * کنترل دسترسی HASHTI در لایه Route انجام می‌شود.
 */
export const adminResetUserPasswordService = async (
  userId: string,
  newPassword: string
) => {
  if (!userId.trim()) {
    throw new Error("INVALID_USER_ID");
  }

  if (newPassword.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await resetUserPasswordAndSessions(
    userId,
    passwordHash
  );

  return {
    id: user.id,
    mobile: user.mobile,
    role: user.role,
  };
};



/**
 * Administrative password reset that records the event atomically with the
 * password/session change. Sensitive password material is never audited.
 */
export const adminResetUserPasswordWithAuditService = async (input: {
  userId: string;
  newPassword: string;
  actorUserId: string;
  actorMobile: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string | null;
}) => {
  if (!input.userId.trim()) {
    throw new Error("INVALID_USER_ID");
  }
  if (input.newPassword.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  return resetUserPasswordAndSessionsWithAudit({
    userId: input.userId,
    passwordHash,
    actorUserId: input.actorUserId,
    actorMobile: input.actorMobile,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    reason: input.reason,
  });
};


export const listAdminUsersService = async (data: {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page: number;
  limit: number;
}) => {
  return listAdminUsers({
    search: data.search,
    role: data.role,
    isActive: data.isActive,
    skip: (data.page - 1) * data.limit,
    take: data.limit,
  });
};
