import type { Request, Response } from "express";
import { ListingStatus } from "@prisma/client";
import { getHashtiPropertyRecords } from "../service/propertyManagementService";

function parseIntegerQuery(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

/** GET /hashti/properties */
export async function getHashtiPropertyRecordsController(req: Request, res: Response) {
  const rawStatus = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "ALL";
  const statuses = Object.values(ListingStatus) as string[];
  if (rawStatus !== "ALL" && !statuses.includes(rawStatus)) {
    return res.status(400).json({ message: "Invalid listing status filter" });
  }
  if (req.query.query !== undefined && (typeof req.query.query !== "string" || req.query.query.length > 200)) {
    return res.status(400).json({ message: "query must be a string up to 200 characters" });
  }

  const limit = parseIntegerQuery(req.query.limit, 25, 1, 100);
  const offset = parseIntegerQuery(req.query.offset, 0, 0, 1_000_000);
  if (limit === null || offset === null) {
    return res.status(400).json({ message: "Invalid pagination parameters" });
  }

  try {
    const result = await getHashtiPropertyRecords({
      status: rawStatus === "ALL" ? undefined : rawStatus as ListingStatus,
      query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
      limit,
      offset,
    });
    return res.status(200).json({
      properties: result.properties,
      pagination: { total: result.total, limit, offset },
    });
  } catch (error) {
    console.error("Could not load Hashti property records:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
