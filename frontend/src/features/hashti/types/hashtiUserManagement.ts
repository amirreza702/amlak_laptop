export type HashtiManagedRole = "CUSTOMER" | "OWNER" | "AGENT" | "HASHTI";
export type HashtiManagedProfileType = "customer" | "owner" | "agent" | "hashti";

export interface HashtiProfileName {
  id: string;
  firstName: string;
  lastName: string;
}

export interface HashtiManagedUser {
  id: string;
  mobile: string;
  role: HashtiManagedRole;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  customer: HashtiProfileName | null;
  owner: HashtiProfileName | null;
  agent: (HashtiProfileName & {
    agencyName: string | null;
    address: string | null;
    isVerified: boolean;
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    verificationReviewedAt: string | null;
    verificationNotes: string | null;
  }) | null;
  staffProfile: {
    id: string;
    mobile: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
}

export interface HashtiAuditLog {
  id: string;
  actorMobile: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: unknown;
  createdAt: string;
}

export type HashtiManagedProfile = {
  type: HashtiManagedProfileType;
  id: string;
  firstName: string;
  lastName: string;
  agencyName?: string | null;
  address?: string | null;
};
