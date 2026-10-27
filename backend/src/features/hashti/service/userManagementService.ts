import bcrypt from "bcrypt";
import {
  createManagedHashtiUser, findManagedUsers, getSuperAdminAccess, updateManagedProfile, updateManagedUserStatus,
  type ManagedProfileUpdate, type ManagedUserQuery,
} from "../repository/userManagementRepository";

export const getSuperAdminAccessService = async (userId: string) => getSuperAdminAccess(userId);
export const getManagedUsersService = async (query: ManagedUserQuery) => findManagedUsers(query);
export const setManagedUserStatusService = async (input: {
  userId: string; isActive: boolean; reason: string; actorUserId: string; actorMobile: string;
}) => updateManagedUserStatus(input);

export const createManagedHashtiUserService = async (input: {
  mobile: string; firstName: string; lastName: string; password: string; actorUserId: string; actorMobile: string;
}) => createManagedHashtiUser({ ...input, passwordHash: await bcrypt.hash(input.password, 12) });

export const updateManagedProfileService = async (input: ManagedProfileUpdate) => updateManagedProfile(input);
