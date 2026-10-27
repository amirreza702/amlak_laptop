/**
 * ============================================================
 * Property Agent Revocation Service
 * ============================================================
 *
 * لغو همکاری Agent با Property توسط Owner
 *
 * جریان:
 *
 * Owner
 *   ↓
 * بررسی Property
 *   ↓
 * بررسی PropertyOwner
 *   ↓
 * بررسی VERIFIED بودن Owner
 *   ↓
 * بررسی PropertyAgent
 *   ↓
 * ACTIVE → REVOKED
 *   ↓
 * ثبت PropertyHistory
 */

import {
  PropertyAgentStatus,
  VerificationStatus,
  PropertyHistoryAction,
} from "@prisma/client";

import {
  findPropertyAgent,
} from "../repository/propertyAgentRepository";

import {
  findPropertyById,
} from "../repository/propertyRepository";

import {
  findPropertyOwner,
} from "../repository/propertyOwnerRepository";

import {
  createPropertyHistory,
} from "../repository/propertyHistoryRepository";

import { prisma } from "../../../lib/prisma";

export interface RevokePropertyAgentInput {
  propertyId: string;
  agentId: string;
  ownerId: string;
}

export async function revokePropertyAgent(
  data: RevokePropertyAgentInput
) {
  /**
   * ----------------------------------------------------------
   * 1. بررسی وجود ملک
   * ----------------------------------------------------------
   */

  const property = await findPropertyById(
    data.propertyId
  );

  if (!property) {
    throw new Error(
      "ملک مورد نظر پیدا نشد."
    );
  }

  /**
   * ----------------------------------------------------------
   * 2. بررسی ارتباط مالک با ملک
   * ----------------------------------------------------------
   *
   * دسترسی به PropertyOwner از طریق Repository انجام می‌شود.
   */

  const propertyOwner =
    await findPropertyOwner(
      data.propertyId,
      data.ownerId
    );

  if (!propertyOwner) {
    throw new Error(
      "این مالک به ملک مورد نظر متصل نیست."
    );
  }

  /**
   * ----------------------------------------------------------
   * 3. مالک باید VERIFIED باشد
   * ----------------------------------------------------------
   */

  if (
    propertyOwner.verificationStatus !==
    VerificationStatus.VERIFIED
  ) {
    throw new Error(
      "مالک هنوز توسط هشتی تأیید نشده است."
    );
  }

  /**
   * ----------------------------------------------------------
   * 4. بررسی ارتباط مشاور با ملک
   * ----------------------------------------------------------
   */

  const propertyAgent =
    await findPropertyAgent(
      data.propertyId,
      data.agentId
    );

  if (!propertyAgent) {
    throw new Error(
      "این مشاور به ملک مورد نظر متصل نیست."
    );
  }

  /**
   * ----------------------------------------------------------
   * 5. فقط Agent فعال قابل لغو است
   * ----------------------------------------------------------
   */

  if (
    propertyAgent.status ===
    PropertyAgentStatus.REVOKED
  ) {
    throw new Error(
      "همکاری این مشاور با ملک قبلاً لغو شده است."
    );
  }

  /**
   * ----------------------------------------------------------
   * 6. تغییر وضعیت + ثبت History
   *
   * هر دو عملیات داخل یک Transaction هستند.
   * ----------------------------------------------------------
   */

  return prisma.$transaction(async (tx) => {
    const updatedPropertyAgent =
      await tx.propertyAgent.update({
        where: {
          propertyId_agentId: {
            propertyId: data.propertyId,
            agentId: data.agentId,
          },
        },
        data: {
          status: PropertyAgentStatus.REVOKED,
        },
      });

    await createPropertyHistory(
      {
        propertyId: data.propertyId,
        action:
          PropertyHistoryAction.LISTING_CHANGED,
        field: "propertyAgent.status",
        oldValue: propertyAgent.status,
        newValue: PropertyAgentStatus.REVOKED,
        performedBy: data.ownerId,
        reason:
          "لغو همکاری مشاور توسط مالک",
      },
      tx
    );

    return updatedPropertyAgent;
  });
}