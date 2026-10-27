export interface DuplicateMatch {
  property: {
    id: string;
    propertyType: string;
    city: string;
    district: string;
    area: number | null;
    rooms: number | null;
    registrationSource?: string;
  };
  distanceMeters: number;
  similarityScore: number;
}
export interface DuplicateReview {
  id: string;
  primaryPropertyId: string;
  candidatePropertyId: string;
  similarityScore: number;
  decision: "SAME_PROPERTY" | "DIFFERENT_PROPERTY" | null;
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}
export interface ExactLocationLog {
  id: string;
  userId: string;
  propertyId: string;
  reason: string | null;
  accessedAt: string;
  user?: { mobile?: string; role?: string };
}

export interface ManagedAgent {
  id: string;
  firstName: string;
  lastName: string;
  agencyName: string | null;
  address: string | null;
  isVerified: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verificationReviewedAt: string | null;
  verificationNotes: string | null;
  verificationReviewedBy: string | null;
  user: { id: string; mobile: string; isActive: boolean; createdAt: string };
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    expiresAt: string | null;
    subscriptionPlan: { id: string; code: string; name: string; level: number; monthlyContactLimit: number };
  } | null;
  usage: {
    periodStart: string;
    usedCount: number;
    monthlyLimit: number;
    remainingCount: number;
    hasActiveSubscription: boolean;
  };
}

export interface AdminSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  level: number;
  monthlyContactLimit: number;
}
export interface ContactAccessAuditLog {
  id: string;
  accessedAt: string;
  agent: { id: string; firstName: string; lastName: string; agencyName: string | null; user: { mobile: string } };
  customer: { id: string; firstName: string; lastName: string; user: { mobile: string } };
  searchRequest: { id: string; city: string; transactionType: string; propertyType: string; status: string };
}

export interface AdminAuditLog {
  id: string;
  actorUserId: string | null;
  actorMobile: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
