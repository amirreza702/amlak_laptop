/**
 * ============================================================
 * Property Agent Approval Service
 * ============================================================
 *
 * تأیید مشاور توسط مالک
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
 * تأیید Agent
 *   ↓
 * ثبت PropertyHistory
 */

import {
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

export interface ApprovePropertyAgentInput {
  propertyId: string;
  agentId: string;
  ownerId: string;
}

export async function approvePropertyAgentByOwnerService(
  data: ApprovePropertyAgentInput
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
   * 4. بررسی مشاور
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

  if (propertyAgent.approvedByOwner) {
    throw new Error(
      "این مشاور قبلاً توسط مالک تأیید شده است."
    );
  }

  /**
   * ----------------------------------------------------------
   * 5. تغییر وضعیت + ثبت History
   *
   * هر دو عملیات داخل یک Transaction انجام می‌شوند.
   * بنابراین یا هر دو موفق می‌شوند یا هیچ‌کدام ثبت نمی‌شوند.
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
          approvedByOwner: true,
          approvedAt: new Date(),
        },
      });

    await createPropertyHistory(
      {
        propertyId: data.propertyId,
        action:
          PropertyHistoryAction.LISTING_CHANGED,
        field: "propertyAgent.approvedByOwner",
        oldValue: "false",
        newValue: "true",
        performedBy: data.ownerId,
        reason:
          "تأیید مشاور توسط مالک",
      },
      tx
    );

    return updatedPropertyAgent;
  });
}