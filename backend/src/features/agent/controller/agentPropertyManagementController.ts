import type { Request, Response } from "express";
import { DocumentType, LandTenure, ListingStatus, OwnershipType, PropertyType, TransactionType } from "@prisma/client";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { getMyAgentPropertyRecords } from "../service/agentPropertyManagementService";

function parseIntegerQuery(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function parseNumberFilter(value: unknown): number | null | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
function parseIntegerFilter(value: unknown): number | null | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
function parseFloorFilter(value: unknown): number | null | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= -10 && parsed <= 200 ? parsed : null;
}

/** GET /agents/me/properties */
export async function getMyAgentPropertyRecordsController(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ message: "Authentication required" });

  if (req.query.query !== undefined && (typeof req.query.query !== "string" || req.query.query.length > 200)) {
    return res.status(400).json({ message: "query must be a string up to 200 characters" });
  }

  const limit = parseIntegerQuery(req.query.limit, 25, 1, 100);
  const offset = parseIntegerQuery(req.query.offset, 0, 0, 1_000_000);
  const areaMin = parseNumberFilter(req.query.areaMin); const areaMax = parseNumberFilter(req.query.areaMax);
  const roomsMin = parseIntegerFilter(req.query.roomsMin); const roomsMax = parseIntegerFilter(req.query.roomsMax);
  const floor = parseFloorFilter(req.query.floor); const totalUnits = parseIntegerFilter(req.query.totalUnits);
  const invalidTextFilter = ["city", "district"].some((key) => {
    const value = req.query[key];
    return value !== undefined && (typeof value !== "string" || value.length > 120);
  }) || (req.query.address !== undefined && (typeof req.query.address !== "string" || req.query.address.length > 500)) || (totalUnits !== undefined && totalUnits !== null && totalUnits < 1);
  const propertyType = req.query.propertyType; const transactionType = req.query.transactionType;
  const documentType = req.query.documentType; const ownershipType = req.query.ownershipType; const landTenure = req.query.landTenure;
  const listingStatus = req.query.listingStatus;
  if (limit === null || offset === null || areaMin === null || areaMax === null || roomsMin === null || roomsMax === null || floor === null || totalUnits === null || invalidTextFilter ||
      (propertyType !== undefined && (typeof propertyType !== "string" || !Object.values(PropertyType).includes(propertyType as PropertyType))) ||
      (transactionType !== undefined && (typeof transactionType !== "string" || !Object.values(TransactionType).includes(transactionType as TransactionType))) ||
      (documentType !== undefined && (typeof documentType !== "string" || !Object.values(DocumentType).includes(documentType as DocumentType))) ||
      (ownershipType !== undefined && (typeof ownershipType !== "string" || !Object.values(OwnershipType).includes(ownershipType as OwnershipType))) ||
      (landTenure !== undefined && (typeof landTenure !== "string" || !Object.values(LandTenure).includes(landTenure as LandTenure))) ||
      (listingStatus !== undefined && (typeof listingStatus !== "string" || !Object.values(ListingStatus).includes(listingStatus as ListingStatus))) ||
      (areaMin !== undefined && areaMax !== undefined && areaMin > areaMax) || (roomsMin !== undefined && roomsMax !== undefined && roomsMin > roomsMax)) {
    return res.status(400).json({ message: "Invalid property filters or pagination parameters" });
  }
  try {
    const result = await getMyAgentPropertyRecords(userId, {
      query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
      city: typeof req.query.city === "string" ? req.query.city.trim() : undefined,
      district: typeof req.query.district === "string" ? req.query.district.trim() : undefined,
      address: typeof req.query.address === "string" ? req.query.address.trim() : undefined,
      propertyType: propertyType as PropertyType | undefined, transactionType: transactionType as TransactionType | undefined,
      documentType: documentType as DocumentType | undefined, ownershipType: ownershipType as OwnershipType | undefined,
      landTenure: landTenure as LandTenure | undefined, listingStatus: listingStatus as ListingStatus | undefined,
      areaMin, areaMax, roomsMin, roomsMax, floor, totalUnits, limit, offset,
    });
    return res.status(200).json({
      properties: result.properties,
      pagination: { total: result.total, limit, offset },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AGENT_PROFILE_NOT_FOUND") {
      return res.status(404).json({ message: "Agent profile not found" });
    }
    console.error("Could not load agent property records:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
