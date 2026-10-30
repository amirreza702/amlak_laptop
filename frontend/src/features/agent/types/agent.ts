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
  customerId: string | null;
  contactName: string;
  contactMobile: string | null;
  transactionType: string;
  propertyType: string;
  city: string;
  budget: string | number | null;
  description: string | null;
  hashtiVerified: boolean;
  status: string;
  createdByRole: "CUSTOMER" | "AGENT" | null;
  isCreatedByMe?: boolean;
  createdAt: string;
  updatedAt: string;
}
