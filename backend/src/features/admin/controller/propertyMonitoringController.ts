import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { getPropertyMonitoring } from "../service/propertyMonitoringService";

export async function getPropertyMonitoringController(req: Request, res: Response) {
  const actor = (req as AuthenticatedRequest).user;
  if (!actor) return res.status(401).json({ message: "Authentication required" });
  const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  try {
    const result = await getPropertyMonitoring(actor.id, { limit, offset });
    return res.status(200).json({
      properties: result.properties,
      pagination: { total: result.total, limit, offset },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PAGINATION") {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }
    console.error("Property monitoring request failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
