import type { VerificationCaseRow, VerificationQueueResponse, VerificationStatus } from "../types/hashtiVerificationQueue";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message || "Request failed.");
  return body as T;
}

export async function getVerificationQueue(params: URLSearchParams): Promise<VerificationQueueResponse> {
  return requestJson<VerificationQueueResponse>(`/hashti/verification-cases?${params.toString()}`);
}

export async function reviewVerificationCase(
  caseId: string,
  status: Exclude<VerificationStatus, "PENDING">,
  notes: string | null,
): Promise<void> {
  await requestJson<unknown>(`/verification-cases/${encodeURIComponent(caseId)}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  });
}

export async function reviewVerificationOwner(
  propertyId: string,
  ownerId: string,
  status: VerificationStatus,
  reason: string,
): Promise<void> {
  await requestJson<unknown>(
    `/properties/${encodeURIComponent(propertyId)}/owners/${encodeURIComponent(ownerId)}/verification`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    },
  );
}

export type { VerificationCaseRow };
