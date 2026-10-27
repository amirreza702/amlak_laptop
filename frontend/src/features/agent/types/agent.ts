export interface AgentProfile {
  id: string;
  firstName: string;
  lastName: string;
  agencyName: string | null;
  address: string | null;
  isVerified: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verificationReviewedAt: string | null;
  verificationNotes: string | null;
}
export interface ActiveRequest {
  id: string;
  transactionType: string;
  propertyType: string;
  city: string;
  budget: string | number | null;
  description: string | null;
  hashtiVerified: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export interface ContactResult {
  customer: { id: string; firstName: string; lastName: string; mobile: string };
}
export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  level: number;
  monthlyContactLimit: number;
}
export interface ActiveAgentSubscription {
  id: string;
  status: string;
  startsAt: string;
  expiresAt: string | null;
  plan: SubscriptionPlan;
}
export interface AgentContactUsage {
  periodStart: string;
  usedCount: number;
  monthlyLimit: number;
  remainingCount: number;
  hasActiveSubscription: boolean;
  subscriptionPlan: { id: string; code: string; name: string; level: number } | null;
}
