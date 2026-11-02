import {
  findManagedUsers, getSuperAdminAccess, updateManagedProfile, updateManagedUserStatus,
  type ManagedProfileUpdate, type ManagedUserQuery,
} from "../repository/userManagementRepository";

export const getSuperAdminAccessService = async (userId: string) => getSuperAdminAccess(userId);
export const getManagedUsersService = async (query: ManagedUserQuery) => findManagedUsers(query);
export const setManagedUserStatusService = async (input: {
  userId: string; isActive: boolean; reason: string; actorUserId: string; actorMobile: string;
}) => updateManagedUserStatus(input);

export const updateManagedProfileService = async (input: ManagedProfileUpdate) => updateManagedProfile(input);
