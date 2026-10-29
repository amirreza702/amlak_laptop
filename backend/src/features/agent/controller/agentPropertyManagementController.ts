import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { getMyAgentPropertyRecords } from "../service/agentPropertyManagementService";

function parseIntegerQuery(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
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
  if (limit === null || offset === null) {
    return res.status(400).json({ message: "Invalid pagination parameters" });
  }

  try {
    const result = await getMyAgentPropertyRecords(userId, {
      query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
      limit,
      offset,
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
