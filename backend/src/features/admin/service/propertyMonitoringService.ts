import { findPropertyMonitoringRecords } from "../repository/propertyMonitoringRepository";

export async function getPropertyMonitoring(input: { limit: number; offset: number }) {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100 ||
      !Number.isInteger(input.offset) || input.offset < 0) {
    throw new Error("INVALID_PAGINATION");
  }
  return findPropertyMonitoringRecords(input);
}
