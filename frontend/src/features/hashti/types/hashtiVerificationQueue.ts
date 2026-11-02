export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export interface OwnerVerificationQueueOwner {
  ownerId: string;
  share: number;
  isPrimary: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  owner: { firstName: string; lastName: string; user: { mobile: string } };
}
export interface OwnerVerificationQueueProperty {
  id: string;
  propertyType: string;
  city: string;
  district: string;
  address: string;
  createdAt: string;
  owners: OwnerVerificationQueueOwner[];
}
export interface OwnerVerificationQueueResponse {
  properties: OwnerVerificationQueueProperty[];
  pagination: { total: number; limit: number; offset: number };
}
