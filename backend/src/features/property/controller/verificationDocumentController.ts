import type { Request, Response } from "express";

import {
  createVerificationDocumentService,
  getVerificationDocumentsService,
} from "../service/verificationDocumentService";

/**
 * ============================================================
 * Create Verification Document Controller
 * ============================================================
 *
 * POST /verification-cases/:id/documents
 *
 * مسئول دریافت اطلاعات مدرک از HTTP و تحویل آن به Service است.
 */
export async function createVerificationDocumentController(
  req: Request<
    { id: string },
    unknown,
    { documentType: string; fileUrl: string }
  >,
  res: Response
) {
  try {
    const verificationCaseId = req.params.id;
    const { documentType, fileUrl } = req.body;

    const verificationDocument =
      await createVerificationDocumentService({
        verificationCaseId,
        documentType,
        fileUrl,
      });

    return res.status(201).json({ verificationDocument });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در ثبت مدرک رخ داد.",
    });
  }
}

/**
 * ============================================================
 * Get Verification Documents Controller
 * ============================================================
 *
 * GET /verification-cases/:id/documents
 *
 * مسئول دریافت شناسه پرونده از URL و درخواست مدارک از Service است.
 *
 * Controller هیچ منطق Business ندارد.
 */
export async function getVerificationDocumentsController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const verificationCaseId = req.params.id;

    const verificationDocuments =
      await getVerificationDocumentsService(verificationCaseId);

    return res.status(200).json({
      verificationDocuments,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در دریافت مدارک رخ داد.",
    });
  }
}