export interface OwnerProperty {
  propertyId: string;
  share: number;
  isPrimary: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  property: {
    id: string;
    propertyType: string;
    city: string;
    district: string;
    address: string;
    area: number | null;
    rooms: number | null;
    isActive: boolean;
    occupancyStatus: string;
    listing: {
      transactionType: string;
      salePrice: string | number | null;
      depositAmount: string | number | null;
      rentAmount: string | number | null;
      status: string;
    } | null;
    agents: Array<{
      agentId: string;
      status: string;
      approvedByOwner: boolean;
      agent: { firstName: string; lastName: string; agencyName: string | null };
    }>;
  };
}
