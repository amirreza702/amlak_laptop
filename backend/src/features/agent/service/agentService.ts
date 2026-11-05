
/**
 * Agent Service
 *
 * مسئول قواعد کسب‌وکار و کنترل مالکیت پروفایل.
 */

import {
  findAgentProfileById,
  findAgentProfileByUserId,
  updateAgentProfile as updateAgentProfileRepository,
} from "../repository/agentRepository";
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";

/**
 * دریافت پروفایل فقط برای مالک آن.
 */
export const getAgentProfile = async (
  agentId: string,
  actor: AuthorizationActor
) => {
  const authenticatedUserId = actor.id;
  const agent = await findAgentProfileById(agentId);

  if (!agent) {
    throw new Error("مشاور مورد نظر پیدا نشد.");
  }

  const allowed = await authorize("agent", "READ", {
    actor,
    resource: { id: agent.id, data: { isSelf: agent.userId === authenticatedUserId } },
  });
  if (!allowed) throw new Error("AGENT_PROFILE_FORBIDDEN");

  // شناسه داخلی مالک نباید در پاسخ برگردد.
  const { userId: _userId, ...profile } = agent;

  return profile;
};

/**
 * ویرایش پروفایل فقط برای مالک آن.
 */
export const updateAgentProfile = async (
  agentId: string,
  actor: AuthorizationActor,
  data: {
    firstName?: string;
    lastName?: string;
    agencyName?: string | null;
    address?: string | null;
  }
) => {
  const authenticatedUserId = actor.id;
  const agent = await findAgentProfileById(agentId);

  if (!agent) {
    throw new Error("مشاور مورد نظر پیدا نشد.");
  }

  const allowed = await authorize("agent", "UPDATE", {
    actor,
    resource: { id: agent.id, data: { isSelf: agent.userId === authenticatedUserId } },
  });
  if (!allowed) throw new Error("AGENT_PROFILE_FORBIDDEN");

  const firstName =
    data.firstName !== undefined
      ? data.firstName.trim()
      : undefined;

  const lastName =
    data.lastName !== undefined
      ? data.lastName.trim()
      : undefined;

  const agencyName =
    data.agencyName !== undefined
      ? data.agencyName?.trim() || null
      : undefined;

  const address =
    data.address !== undefined
      ? data.address?.trim() || null
      : undefined;

  if (firstName !== undefined && firstName.length === 0) {
    throw new Error("نام مشاور نمی‌تواند خالی باشد.");
  }

  if (lastName !== undefined && lastName.length === 0) {
    throw new Error("نام خانوادگی مشاور نمی‌تواند خالی باشد.");
  }

  if (
    firstName === undefined &&
    lastName === undefined &&
    data.agencyName === undefined &&
    data.address === undefined
  ) {
    throw new Error("حداقل یک فیلد برای ویرایش ارسال کنید.");
  }

  return updateAgentProfileRepository(agentId, {
    ...(firstName !== undefined && { firstName }),
    ...(lastName !== undefined && { lastName }),
    ...(data.agencyName !== undefined && { agencyName }),
    ...(data.address !== undefined && { address }),
  });
};


/**
 * دریافت پروفایل از روی نشست جاری، بدون اتکا به profileId ارسال‌شده از مرورگر.
 */
export const getCurrentAgentProfile = async (actor: AuthorizationActor) => {
  const authenticatedUserId = actor.id;
  const agent = await findAgentProfileByUserId(authenticatedUserId);

  if (!agent) {
    throw new Error("AGENT_PROFILE_NOT_FOUND");
  }
  const allowed = await authorize("agent", "READ", {
    actor,
    resource: { id: agent.id, data: { isSelf: agent.userId === authenticatedUserId } },
  });
  if (!allowed) throw new Error("AGENT_PROFILE_FORBIDDEN");

  const { userId: _userId, ...profile } = agent;
  return profile;
};
