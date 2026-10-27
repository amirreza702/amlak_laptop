export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface VerificationQueueOwner {
  ownerId: string;
  share: number;
  verificationStatus: VerificationStatus;
  owner: { firstName: string; lastName: string };
}

export interface VerificationCaseRow {
  id: string;
  propertyId: string;
  status: VerificationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  property: {
    id: string;
    propertyType: string;
    city: string;
    district: string;
    address: string;
    owners: VerificationQueueOwner[];
  };
}

export interface VerificationQueueResponse {
  cases: VerificationCaseRow[];
  pagination: { total: number; limit: number; offset: number };
}
