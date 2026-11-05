/**
 * ============================================================
 * Exact Location Access Log Service
 * ============================================================
 *
 * منطق ثبت و دریافت سابقه دسترسی به موقعیت دقیق ملک.
 */

import {
  createExactLocationAccessLog,
  findExactLocationAccessLogs,
} from "../repository/exactLocationAccessLogRepository";

import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";

import type { ExactLocationAccessLog } from "@prisma/client";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { prisma } from "../../../lib/prisma";

/**
 * ============================================================
 * Create Access Log
 * ============================================================
 */

export interface CreateExactLocationAccessLogInput {
  propertyId: string;
  actor: AuthorizationActor;
  reason?: string | null;
}

export const createExactLocationAccessLogService = async (
  data: CreateExactLocationAccessLogInput
): Promise<ExactLocationAccessLog> => {
  return prisma.$transaction(async (tx) => {
    const property = await findPropertyAuthorizationContextById(data.propertyId, tx);
    if (!property) throw new Error("ملک مورد نظر پیدا نشد.");

    const canViewExactLocation = await authorizePropertyAction(data.actor, "VIEW_EXACT_LOCATION", property);
    const canCreateLog = await authorizePropertyAction(data.actor, "CREATE_EXACT_LOCATION_ACCESS_LOG", property);
    if (!canViewExactLocation || !canCreateLog) throw new Error("EXACT_LOCATION_ACCESS_FORBIDDEN");

    return createExactLocationAccessLog(
      data.propertyId,
      data.actor.id,
      data.reason ?? null,
      tx,
    );
  }, { isolationLevel: "Serializable" });
};

/**
 * ============================================================
 * Get Access Logs
 * ============================================================
 */

export const getExactLocationAccessLogsService = async (
  propertyId: string,
  actor: AuthorizationActor,
): Promise<ExactLocationAccessLog[]> => {
  const property = await findPropertyAuthorizationContextById(propertyId);
  if (!property) throw new Error("ملک مورد نظر پیدا نشد.");

  const allowed = await authorizePropertyAction(
    actor,
    "VIEW_EXACT_LOCATION_ACCESS_LOGS",
    property,
  );
  if (!allowed) throw new Error("EXACT_LOCATION_LOGS_FORBIDDEN");

  return findExactLocationAccessLogs(propertyId);
};