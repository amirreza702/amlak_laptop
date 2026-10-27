
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", cache: "no-store", ...init });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    const message = body.message || "درخواست به سرور ناموفق بود.";
    if (message === "Authentication required") throw new Error("برای استفاده از پنل هشتی دوباره وارد شوید.");
    if (message === "You do not have permission to access this resource") throw new Error("این عملیات فقط برای تیم هشتی مجاز است.");
    if (message === "Session is invalid or expired") throw new Error("نشست منقضی شده است؛ دوباره وارد شوید.");
    throw new Error(message);
  }
  return body as T;
}

import type {
  AdminAuditLog,
  DuplicateMatch,
  DuplicateReview,
  ExactLocationLog,
  AdminSubscriptionPlan,
  ContactAccessAuditLog,
  ManagedAgent,
} from "@/features/hashti/types/hashti";

export async function getHashtiAgents(
  verificationStatus: "pending" | "verified" | "rejected" | "all"
): Promise<{ agents: ManagedAgent[]; pagination: { total: number; limit: number; offset: number } }> {
  return requestJson(
    "/hashti/agents?verificationStatus=" + verificationStatus + "&limit=100&offset=0"
  );
}

export async function getHashtiSubscriptionPlans(): Promise<{ plans: AdminSubscriptionPlan[] }> {
  return requestJson("/subscription-plans");
}

export async function getHashtiAdminAuditLogs(
  params: URLSearchParams
): Promise<{ logs: AdminAuditLog[] }> {
  return requestJson("/hashti/admin-audit-logs?" + params.toString());
}

export async function getHashtiContactAccessLogs(
  params: URLSearchParams
): Promise<{ logs: ContactAccessAuditLog[] }> {
  return requestJson("/hashti/contact-access-logs?" + params.toString());
}


export async function reviewHashtiAgent(agentId: string, payload: { verificationStatus: "PENDING" | "VERIFIED" | "REJECTED"; notes: string | null }): Promise<{ agent: ManagedAgent }> {
  return requestJson("/hashti/agents/" + encodeURIComponent(agentId) + "/verification", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function changeHashtiAgentSubscription(agentId: string, payload: { planId: string } | { planId: string; startsAt: string; expiresAt?: string }): Promise<unknown> {
  const isUpgrade = !("startsAt" in payload);
  return requestJson("/hashti/agents/" + encodeURIComponent(agentId) + "/subscriptions", { method: isUpgrade ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function getHashtiDuplicateMatches(propertyId: string): Promise<{ matches: DuplicateMatch[] }> {
  return requestJson("/properties/" + encodeURIComponent(propertyId) + "/duplicate-matches");
}

export async function getHashtiDuplicateReviews(propertyId: string): Promise<{ duplicateReviews: DuplicateReview[] }> {
  return requestJson("/properties/" + encodeURIComponent(propertyId) + "/duplicate-reviews");
}

export async function createHashtiDuplicateReview(propertyId: string, candidatePropertyId: string): Promise<unknown> {
  return requestJson("/properties/" + encodeURIComponent(propertyId) + "/duplicate-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidatePropertyId }) });
}

export async function decideHashtiDuplicateReview(reviewId: string, payload: { decision: "SAME_PROPERTY" | "DIFFERENT_PROPERTY"; notes: string | null }): Promise<unknown> {
  return requestJson("/duplicate-reviews/" + encodeURIComponent(reviewId) + "/review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function resetHashtiUserPassword(userId: string, newPassword: string): Promise<unknown> {
  return requestJson("/auth/admin/users/" + encodeURIComponent(userId) + "/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }) });
}

export async function reviewHashtiVerificationCase(caseId: string, payload: { status: "VERIFIED" | "REJECTED"; notes: string | null }): Promise<unknown> {
  return requestJson("/verification-cases/" + encodeURIComponent(caseId) + "/review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function getHashtiExactLocationAccessLogs(propertyId: string): Promise<{ accessLogs: ExactLocationLog[] }> {
  return requestJson("/properties/" + encodeURIComponent(propertyId) + "/exact-location-access-logs");
}
