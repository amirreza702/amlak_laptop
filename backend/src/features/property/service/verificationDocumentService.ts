/**
 * ============================================================
 * VerificationDocument Service
 * ============================================================
 *
 * منطق Business مربوط به مدارک پرونده تأیید.
 *
 * عملیات:
 *
 * 1. ایجاد مدرک
 * 2. دریافت مدارک یک پرونده
 */

import { VerificationStatus } from "@prisma/client";

import {
  createVerificationDocument,
  findVerificationDocuments,
} from "../repository/verificationDocumentRepository";

import {
  findVerificationCaseById,
} from "../repository/verificationCaseRepository";

import type { VerificationDocument } from "../types/verificationDocument";

/**
 * ورودی ثبت مدرک
 */
export interface CreateVerificationDocumentInput {
  verificationCaseId: string;
  documentType: string;
  fileUrl: string;
}

/**
 * ایجاد مدرک برای پرونده تأیید
 */
export const createVerificationDocumentService = async (
  data: CreateVerificationDocumentInput
): Promise<VerificationDocument> => {

  /**
   * بررسی وجود پرونده تأیید
   */
  const verificationCase =
    await findVerificationCaseById(
      data.verificationCaseId
    );

  if (!verificationCase) {
    throw new Error(
      "پرونده تأیید مورد نظر پیدا نشد."
    );
  }

  /**
   * فقط پرونده PENDING می‌تواند مدرک جدید دریافت کند.
   */
  if (
    verificationCase.status !==
    VerificationStatus.PENDING
  ) {
    throw new Error(
      "این پرونده دیگر در وضعیت دریافت مدارک نیست."
    );
  }

  return createVerificationDocument(
    data.verificationCaseId,
    data.documentType,
    data.fileUrl
  );
};

/**
 * دریافت تمام مدارک یک پرونده تأیید
 */
export const getVerificationDocumentsService = async (
  verificationCaseId: string
): Promise<VerificationDocument[]> => {

  /**
   * ابتدا بررسی می‌کنیم پرونده وجود داشته باشد.
   */
  const verificationCase =
    await findVerificationCaseById(
      verificationCaseId
    );

  if (!verificationCase) {
    throw new Error(
      "پرونده تأیید مورد نظر پیدا نشد."
    );
  }

  /**
   * دریافت مدارک از Repository
   */
  return findVerificationDocuments(
    verificationCaseId
  );
};