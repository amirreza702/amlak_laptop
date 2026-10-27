import type {
  AuthResponse as ApiAuthResponse,
  UserPublic,
  UserRole,
} from "../api/authApi";

export type { UserRole, UserPublic };
export type AuthResponse = ApiAuthResponse;

/**
 * اطلاعات ثبت‌نامی که فرم فرانت‌اند جمع‌آوری می‌کند.
 * بک‌اند فعلی نام، نام خانوادگی و رمز را می‌پذیرد؛
 * نام آژانس در قرارداد فعلی ثبت‌نام auth تعریف نشده است.
 */
export interface UserRegisterData {
  firstName: string;
  lastName: string;
  mobile: string;
  password: string;
  role: Exclude<UserRole, "HASHTI">;
}

/** سازگاری با نام‌های قبلی پروژه */
export type AgentRegisterData = UserRegisterData;

export interface AgentLoginData {
  mobile: string;
  password: string;
}
