import {
  PropertyHistoryAction,
  VerificationStatus,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";

import {
  createVerificationCase,
  findLatestVerificationCase,
  findVerificationCaseById,
  reviewVerificationCase,
} from "../repository/verificationCaseRepository";

import { findPropertyById } from "../repository/propertyRepository";
import { createPropertyHistory } from "../repository/propertyHistoryRepository";

import type { VerificationCase } from "../types/verificationCase";

/**
 * ============================================================
 * Create Verification Case
 * ============================================================
 */

export const createVerificationCaseService = async (
  propertyId: string
): Promise<VerificationCase> => {
  const property = await findPropertyById(propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  const existingCase = await findLatestVerificationCase(propertyId);

  if (
    existingCase &&
    existingCase.status === VerificationStatus.PENDING
  ) {
    return existingCase;
  }

  return createVerificationCase(propertyId);
};

/**
 * ============================================================
 * Review Verification Case
 * ============================================================
 */

export interface ReviewVerificationCaseInput {
  verificationCaseId: string;
  status: VerificationStatus;
  reviewedBy: string;
  notes: string | null;
}

export const reviewVerificationCaseService = async (
  data: ReviewVerificationCaseInput
): Promise<VerificationCase> => {
  const verificationCase = await findVerificationCaseById(
    data.verificationCaseId
  );

  if (!verificationCase) {
    throw new Error("پرونده تأیید مورد نظر پیدا نشد.");
  }

  if (verificationCase.status !== VerificationStatus.PENDING) {
    throw new Error("این پرونده قبلاً بررسی شده است.");
  }

  if (
    data.status !== VerificationStatus.VERIFIED &&
    data.status !== VerificationStatus.REJECTED
  ) {
    throw new Error("وضعیت بررسی پرونده معتبر نیست.");
  }

  /**
   * ==========================================================
   * Transaction
   * ==========================================================
   *
   * تغییر وضعیت VerificationCase
   * و ثبت PropertyHistory باید یک عملیات اتمیک باشند.
   *
   * اگر هر کدام شکست بخورد:
   *
   * VerificationCase → Rollback
   * PropertyHistory   → Rollback
   */
  return prisma.$transaction(async (tx) => {
    const reviewedCase = await reviewVerificationCase(
      data.verificationCaseId,
      data.status,
      data.reviewedBy,
      data.notes,
      tx
    );

    await createPropertyHistory(
      {
        propertyId: verificationCase.propertyId,
        action: PropertyHistoryAction.VERIFICATION_CHANGED,
        field: "verificationCase.status",
        oldValue: VerificationStatus.PENDING,
        newValue: data.status,
        performedBy: data.reviewedBy,
        reason:
          data.notes ?? "بررسی پرونده تأیید توسط هشتی",
      },
      tx
    );

    
    const actor = await tx.user.findUnique({
      where: { id: data.reviewedBy },
      select: { id: true, mobile: true, role: true },
    });

    if (actor?.role === "HASHTI") {
      await tx.adminAuditLog.create({
        data: {
          actorUserId: actor.id,
          actorMobile: actor.mobile,
          actorRole: actor.role,
          action: "PROPERTY_VERIFICATION_CASE_REVIEWED",
          targetType: "PROPERTY_VERIFICATION_CASE",
          targetId: data.verificationCaseId,
          details: {
            propertyId: verificationCase.propertyId,
            previousStatus: verificationCase.status,
            newStatus: data.status,
            notes: data.notes,
          },
        },
      });
    }

    return reviewedCase;
  });
};