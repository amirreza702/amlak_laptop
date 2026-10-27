import {
  createAdminAuditLog as createAdminAuditLogRepository,
  findAdminAuditLogs,
  type AdminAuditLogQuery,
  type CreateAdminAuditLogInput,
} from "../repository/adminAuditLogRepository";

export const writeAdminAuditLogService = async (
  input: CreateAdminAuditLogInput
) => createAdminAuditLogRepository(input);

export const getAdminAuditLogsService = async (
  query: AdminAuditLogQuery
) => findAdminAuditLogs(query);


/**
 * Audit failure should be visible in server logs without reporting a failed
 * subscription/password operation after that operation has already committed.
 * Agent verification itself writes its audit row inside the same DB transaction.
 */
export const writeAdminAuditLogBestEffort = async (
  input: CreateAdminAuditLogInput
): Promise<void> => {
  try {
    await createAdminAuditLogRepository(input);
  } catch (error) {
    console.error("Failed to persist admin audit log:", error);
  }
};
