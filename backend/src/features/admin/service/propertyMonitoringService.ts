import { findPropertyMonitoringRecords } from "../repository/propertyMonitoringRepository";
import { requireSuperAdminServicePermission } from "./adminService";

export async function getPropertyMonitoring(actorUserId: string, input: { limit: number; offset: number }) {
  await requireSuperAdminServicePermission(actorUserId);
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100 ||
      !Number.isInteger(input.offset) || input.offset < 0) {
    throw new Error("INVALID_PAGINATION");
  }
  return findPropertyMonitoringRecords(input);
}
