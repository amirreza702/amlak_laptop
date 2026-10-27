import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  getHashtiContactAccessLogsService,
  getManagedAgentsService,
  setAgentVerificationService,
} from "../service/agentManagementService";
import type {
  AgentVerificationFilter,
  ContactAccessLogQuery,
} from "../repository/agentManagementRepository";

function parseIntegerQuery(
  value: unknown,
  defaultValue: number,
  minimum: number,
  maximum: number
): number | null {
  if (value === undefined) return defaultValue;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }
  return parsed;
}

/**
 * GET /hashti/agents?verificationStatus=pending|verified|rejected|all&limit=50&offset=0
 */
export async function getManagedAgentsController(
  req: Request,
  res: Response
) {
  const rawStatus = req.query.verificationStatus;
  const verificationStatus = (
    typeof rawStatus === "string" ? rawStatus : "pending"
  ).toLowerCase();

  if (!["pending", "verified", "rejected", "all"].includes(verificationStatus)) {
    return res.status(400).json({
      message: "verificationStatus must be pending, verified, rejected, or all",
    });
  }

  const limit = parseIntegerQuery(req.query.limit, 50, 1, 100);
  const offset = parseIntegerQuery(req.query.offset, 0, 0, 1_000_000);

  if (limit === null || offset === null) {
    return res.status(400).json({
      message: "Invalid pagination parameters",
    });
  }

  try {
    const result = await getManagedAgentsService({
      verificationStatus: verificationStatus as AgentVerificationFilter,
      limit,
      offset,
    });

    return res.status(200).json({
      agents: result.agents,
      periodStart: result.periodStart,
      pagination: { total: result.total, limit, offset },
    });
  } catch (error) {
    console.error("Error listing managed agents:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * PATCH /hashti/agents/:agentId/verification
 * Body: { "verificationStatus": "PENDING" | "VERIFIED" | "REJECTED", "notes"?: string | null }
 */
export async function setAgentVerificationController(
  req: Request<{ agentId: string }>,
  res: Response
) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { verificationStatus, notes = null } = req.body ?? {};
  if (!["PENDING", "VERIFIED", "REJECTED"].includes(verificationStatus)) {
    return res.status(400).json({
      message: "verificationStatus must be PENDING, VERIFIED, or REJECTED",
    });
  }

  if (notes !== null && typeof notes !== "string") {
    return res.status(400).json({ message: "notes must be a string or null" });
  }

  if (verificationStatus === "REJECTED" && (typeof notes !== "string" || !notes.trim())) {
    return res.status(400).json({
      message: "A reason is required when rejecting an agent",
    });
  }

  if (typeof notes === "string" && notes.length > 2000) {
    return res.status(400).json({ message: "notes must be 2000 characters or fewer" });
  }

  try {
    const agent = await setAgentVerificationService({
      agentId: req.params.agentId,
      verificationStatus: verificationStatus as "PENDING" | "VERIFIED" | "REJECTED",
      reviewerUserId: user.id,
      reviewerMobile: user.mobile,
      notes,
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    return res.status(200).json({ agent });
  } catch (error) {
    console.error("Error updating agent verification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /hashti/contact-access-logs?agentId=&from=&to=&limit=50&offset=0
 * گزارش دسترسی به اطلاعات تماس؛ محدود به کارکنان هشتی است.
 */
export async function getHashtiContactAccessLogsController(
  req: Request,
  res: Response
) {
  const limit = parseIntegerQuery(req.query.limit, 50, 1, 100);
  const offset = parseIntegerQuery(req.query.offset, 0, 0, 1_000_000);

  if (limit === null || offset === null) {
    return res.status(400).json({
      message: "Invalid pagination parameters",
    });
  }

  const agentId =
    typeof req.query.agentId === "string" && req.query.agentId.trim()
      ? req.query.agentId.trim()
      : undefined;
  const rawFrom = req.query.from;
  const rawTo = req.query.to;

  if (
    (rawFrom !== undefined && typeof rawFrom !== "string") ||
    (rawTo !== undefined && typeof rawTo !== "string")
  ) {
    return res.status(400).json({
      message: "from and to must be ISO date strings",
    });
  }

  const from = typeof rawFrom === "string" ? new Date(rawFrom) : undefined;
  const to = typeof rawTo === "string" ? new Date(rawTo) : undefined;

  if (
    (from && Number.isNaN(from.getTime())) ||
    (to && Number.isNaN(to.getTime()))
  ) {
    return res.status(400).json({
      message: "from and to must be valid dates",
    });
  }

  if (from && to && from > to) {
    return res.status(400).json({
      message: "from cannot be later than to",
    });
  }

  const query: ContactAccessLogQuery = {
    agentId,
    from,
    to,
    limit,
    offset,
  };

  try {
    const result = await getHashtiContactAccessLogsService(query);
    return res.status(200).json({
      logs: result.logs,
      pagination: { total: result.total, limit, offset },
    });
  } catch (error) {
    console.error("Error getting contact access logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
