const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  const data = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(data.message || "درخواست ناموفق بود.");
  return data as T;
}
function query(filters: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.toString();
}
export interface AdminPage<T> { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
export interface AdminOwner {
  id: string; userId: string; firstName: string; lastName: string;
  user: { id: string; mobile: string; isActive: boolean; createdAt: string };
  _count: { properties: number; evaluations: number };
}
export interface AdminAgent {
  id: string; userId: string; firstName: string; lastName: string; agencyName: string | null;
  isVerified: boolean; user: { id: string; mobile: string; isActive: boolean; createdAt: string };
  subscriptions: Array<{ id: string; status: string; planId: string; startsAt: string; expiresAt: string | null; subscriptionPlan: { id: string; code: string; name: string; level: number } }>;
}
export interface AdminAuditEntry {
  id: string; actorUserId: string; targetUserId: string | null; targetType: string; targetId: string;
  operation: string; reason: string; before: unknown; after: unknown; createdAt: string;
  actor: { id: string; mobile: string }; target: { id: string; mobile: string; role: string } | null;
}
export interface SubscriptionPlan { id: string; code: string; name: string; level: number; monthlyContactLimit: number; status: string }

export const getAdminOwners = (filters: { search?: string; isActive?: string; page?: number; limit?: number } = {}) =>
  request<AdminPage<AdminOwner>>(`/admin/owners?${query(filters)}`);
export const getAdminAgents = (filters: { search?: string; isActive?: string; isVerified?: string; subscriptionStatus?: string; page?: number; limit?: number } = {}) =>
  request<AdminPage<AdminAgent>>(`/admin/agents?${query(filters)}`);
export const setAdminUserStatus = (userId: string, isActive: boolean, reason: string) =>
  request<{ item: { id: string; isActive: boolean } }>(`/admin/users/${encodeURIComponent(userId)}/status`, { method: "PATCH", body: JSON.stringify({ isActive, reason }) });
export const setAdminAgentVerification = (agentId: string, isVerified: boolean, reason: string) =>
  request<{ item: AdminAgent }>(`/admin/agents/${encodeURIComponent(agentId)}/verification`, { method: "PATCH", body: JSON.stringify({ isVerified, reason }) });
export const getAdminAgentHistory = (agentId: string, page = 1) =>
  request<AdminPage<AdminAuditEntry>>(`/admin/agents/${encodeURIComponent(agentId)}/history?${query({ page, limit: 20 })}`);
export const getAdminOwnerHistory = (ownerId: string, page = 1) =>
  request<AdminPage<AdminAuditEntry>>(`/admin/owners/${encodeURIComponent(ownerId)}/history?${query({ page, limit: 20 })}`);
export const getAdminSubscriptionPlans = () => request<{ items: SubscriptionPlan[] }>("/admin/subscription-plans");
export const setAdminAgentSubscription = (agentId: string, input: { planId: string; status: string; startsAt: string; expiresAt?: string; reason: string }) =>
  request<{ item: AdminAgent["subscriptions"][number] }>(`/admin/agents/${encodeURIComponent(agentId)}/subscription`, { method: "POST", body: JSON.stringify(input) });
export const getAdminAudit = (filters: { targetType?: string; targetId?: string; targetUserId?: string; actorUserId?: string; page?: number; limit?: number } = {}) =>
  request<AdminPage<AdminAuditEntry>>(`/admin/audit?${query(filters)}`);

export const ADMIN_PERMISSION_OPTIONS = [
  { value: "USERS_READ", label: "مشاهده کاربران" },
  { value: "USERS_MANAGE", label: "مدیریت وضعیت حساب‌ها" },
  { value: "OWNERS_MANAGE", label: "مدیریت مالکان" },
  { value: "AGENTS_MANAGE", label: "مدیریت مشاوران و اشتراک" },
  { value: "STAFF_MANAGE", label: "مدیریت کارکنان" },
  { value: "AUDIT_READ", label: "مشاهده سوابق مدیریتی" },
] as const;
export const createAdminStaff = (input: { mobile: string; password: string; permissions: string[]; reason: string }) =>
  request<{ item: { id: string; mobile: string; adminPermissions: string[] } }>("/admin/staff", { method: "POST", body: JSON.stringify(input) });
export const updateAdminStaffPermissions = (userId: string, permissions: string[], reason: string) =>
  request<{ item: { id: string; mobile: string; adminPermissions: string[] } }>(`/admin/staff/${encodeURIComponent(userId)}/permissions`, { method: "PATCH", body: JSON.stringify({ permissions, reason }) });

export const setAdminOwnerStatus = (ownerId: string, isActive: boolean, reason: string) =>
  request<{ item: { id: string; isActive: boolean } }>(`/admin/owners/${encodeURIComponent(ownerId)}/status`, { method: "PATCH", body: JSON.stringify({ isActive, reason }) });

export interface AdminStaff {
  id: string; mobile: string; role: "HASHTI"; isActive: boolean; isSuperAdmin: boolean; adminPermissions: string[]; createdAt: string;
}
export const getAdminStaff = () => request<{ items: AdminStaff[] }>("/admin/staff");

export type AdminOwnerDetails = AdminOwner & {
  properties: Array<{ property: { id: string; city: string; district: string; address: string; status: string } }>;
};
export type AdminAgentDetails = AdminAgent & {
  address: string | null;
  _count: { propertyAgents: number; evaluations: number; contactAccessLogs: number };
};
export const getAdminOwnerDetails = (ownerId: string) =>
  request<{ item: AdminOwnerDetails }>(`/admin/owners/${encodeURIComponent(ownerId)}`);
export const getAdminAgentDetails = (agentId: string) =>
  request<{ item: AdminAgentDetails }>(`/admin/agents/${encodeURIComponent(agentId)}`);

export const getAdminUserDetails = (userId: string) =>
  request<{ item: import("@/features/auth/api/authApi").AdminUser }>(`/admin/users/${encodeURIComponent(userId)}`);

export const updateAdminManagedProfile = (
  profileType: "owner" | "agent",
  profileId: string,
  input: { firstName: string; lastName: string; agencyName?: string | null; address?: string | null; reason: string },
) =>
  request<{ profile: { id: string; firstName: string; lastName: string; agencyName?: string | null; address?: string | null } }>(
    `/hashti/management/profiles/${profileType}/${encodeURIComponent(profileId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );

export const setAdminAgentStatus = (agentId: string, isActive: boolean, reason: string) =>
  request<{ item: { id: string; isActive: boolean } }>(`/admin/agents/${encodeURIComponent(agentId)}/status`, { method: "PATCH", body: JSON.stringify({ isActive, reason }) });
