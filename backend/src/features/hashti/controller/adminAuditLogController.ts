import type { Request, Response } from "express";
import { getAdminAuditLogsService } from "../service/adminAuditLogService";
import type { AdminAuditLogQuery } from "../repository/adminAuditLogRepository";

function parseIntegerQuery(
  value: unknown,
  defaultValue: number,
  minimum: number,
  maximum: number
): number | null {
  if (value === undefined) return defaultValue;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function getOptionalString(
  value: unknown,
  maximumLength = 200
): { value?: string; invalid: boolean } {
  if (value === undefined || value === "") return { invalid: false };
  if (typeof value !== "string" || value.length > maximumLength) {
    return { invalid: true };
  }
  return { value: value.trim() || undefined, invalid: false };
}

/**
 * GET /hashti/admin-audit-logs
 * فیلترهای اختیاری: actorUserId, action, targetType, targetId, from, to, limit, offset
 */
export async function getAdminAuditLogsController(
  req: Request,
  res: Response
) {
  const limit = parseIntegerQuery(req.query.limit, 50, 1, 100);
  const offset = parseIntegerQuery(req.query.offset, 0, 0, 1_000_000);
  if (limit === null || offset === null) {
    return res.status(400).json({ message: "Invalid pagination parameters" });
  }

  const actorUserId = getOptionalString(req.query.actorUserId);
  const action = getOptionalString(req.query.action);
  const targetType = getOptionalString(req.query.targetType);
  const targetId = getOptionalString(req.query.targetId);

  if (actorUserId.invalid || action.invalid || targetType.invalid || targetId.invalid) {
    return res.status(400).json({ message: "Invalid audit log filter" });
  }

  const rawFrom = req.query.from;
  const rawTo = req.query.to;
  if (
    (rawFrom !== undefined && typeof rawFrom !== "string") ||
    (rawTo !== undefined && typeof rawTo !== "string")
  ) {
    return res.status(400).json({ message: "from and to must be ISO date strings" });
  }

  const from = typeof rawFrom === "string" ? new Date(rawFrom) : undefined;
  const to = typeof rawTo === "string" ? new Date(rawTo) : undefined;
  if (
    (from && Number.isNaN(from.getTime())) ||
    (to && Number.isNaN(to.getTime()))
  ) {
    return res.status(400).json({ message: "from and to must be valid dates" });
  }
  if (from && to && from > to) {
    return res.status(400).json({ message: "from cannot be later than to" });
  }

  const query: AdminAuditLogQuery = {
    actorUserId: actorUserId.value,
    action: action.value,
    targetType: targetType.value,
    targetId: targetId.value,
    from,
    to,
    limit,
    offset,
  };

  try {
    const result = await getAdminAuditLogsService(query);
    return res.status(200).json({
      logs: result.logs,
      pagination: { total: result.total, limit, offset },
    });
  } catch (error) {
    console.error("Error getting admin audit logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
