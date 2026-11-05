import {
  findManagedAgents,
  updateAgentVerification as updateAgentVerificationRepository,
  type AgentManagementQuery,
} from "../repository/agentManagementRepository";
import { requireAdminServicePermission } from "../../admin/service/adminService";

export const getManagedAgentsService = async (
  actorUserId: string,
  query: AgentManagementQuery
) => {
  await requireAdminServicePermission(actorUserId, "AGENTS_MANAGE");
  return findManagedAgents(query);
};

export const setAgentVerificationService = async (input: {
  agentId: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  reviewerUserId: string;
  reviewerMobile: string;
  notes: string | null;
}) => {
  await requireAdminServicePermission(input.reviewerUserId, "AGENTS_MANAGE");
  return updateAgentVerificationRepository(input);
};
