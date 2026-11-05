import {
  findManagedUsers, getSuperAdminAccess, updateManagedProfile, updateManagedUserStatus,
  type ManagedProfileUpdate, type ManagedUserQuery,
} from "../repository/userManagementRepository";
import { requireAdminServicePermission } from "../../admin/service/adminService";

export const getSuperAdminAccessService = async (userId: string) => getSuperAdminAccess(userId);
export const getManagedUsersService = async (actorUserId: string, query: ManagedUserQuery) => {
  await requireAdminServicePermission(actorUserId, "USERS_READ");
  return findManagedUsers(query);
};
export const setManagedUserStatusService = async (input: {
  userId: string; isActive: boolean; reason: string; actorUserId: string; actorMobile: string;
}) => {
  await requireAdminServicePermission(input.actorUserId, "USERS_MANAGE");
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
