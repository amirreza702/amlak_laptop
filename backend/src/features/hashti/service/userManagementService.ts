import {
  findManagedUsers, findManagedUserRole, getSuperAdminAccess, updateManagedProfile, updateManagedUserStatus,
  type ManagedProfileUpdate, type ManagedUserQuery,
} from "../repository/userManagementRepository";
import { hasAdminServicePermission, requireAdminServicePermission } from "../../admin/service/adminService";

export const getSuperAdminAccessService = async (userId: string) => getSuperAdminAccess(userId);
export const getManagedUsersService = async (actorUserId: string, query: ManagedUserQuery) => {
  await requireAdminServicePermission(actorUserId, "USERS_READ");
  const includeAgentPrivateData = await hasAdminServicePermission(actorUserId, "AGENTS_MANAGE");
  return findManagedUsers(query, includeAgentPrivateData);
};
export const setManagedUserStatusService = async (input: {
  userId: string; isActive: boolean; reason: string; actorUserId: string; actorMobile: string;
}) => {
  const target = await findManagedUserRole(input.userId);
  if (!target) throw new Error("USER_NOT_FOUND");
  const permission = target.role === "HASHTI"
    ? "STAFF_MANAGE"
    : target.role === "OWNER"
      ? "OWNERS_MANAGE"
      : target.role === "AGENT"
        ? "AGENTS_MANAGE"
        : "USERS_MANAGE";
  await requireAdminServicePermission(input.actorUserId, permission);
  return updateManagedUserStatus(input);
};

export const updateManagedProfileService = async (input: ManagedProfileUpdate) => {
  const permission = input.profileType === "owner"
    ? "OWNERS_MANAGE"
    : input.profileType === "agent"
      ? "AGENTS_MANAGE"
      : "USERS_MANAGE";
  await requireAdminServicePermission(input.actorUserId, permission);
  return updateManagedProfile(input);
};
