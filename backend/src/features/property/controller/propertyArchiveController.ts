import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  archivePropertyService,
  getPropertyArchiveService,
  restorePropertyService,
} from "../service/propertyArchiveService";

/**
 * ============================================================
 * Archive Property Controller
 * ============================================================
 *
 * PATCH /properties/:id/archive
 */
export async function archivePropertyController(
  req: Request<
    { id: string },
    unknown,
    {
      archivedReason?: string | null;
    }
  >,
  res: Response
) {
  try {
    const propertyId = req.params.id;
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });

    const {
      archivedReason = null,
    } = req.body;

    const propertyArchive =
      await archivePropertyService({
        propertyId,
        archivedReason,
        actor: { id: user.id, role: user.role },
      });

    return res.status(200).json({
      propertyArchive,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در آرشیو ملک رخ داد.",
    });
  }
}

/**
 * ============================================================
 * Get Property Archive Controller
 * ============================================================
 *
 * GET /properties/:id/archive
 */
export async function getPropertyArchiveController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const propertyId = req.params.id;
    const user = (req as AuthenticatedRequest).user;
    if (!user) return res.status(401).json({ message: "Authentication required" });

    const propertyArchive =
      await getPropertyArchiveService(propertyId, { id: user.id, role: user.role });

    return res.status(200).json({
      propertyArchive,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در دریافت آرشیو ملک رخ داد.",
    });
  }
}

export async function restorePropertyController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const propertyId = String(req.params.id);
    const user = (req as AuthenticatedRequest).user;
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }

    const archive =
      await restorePropertyService(propertyId, { id: user.id, role: user.role });

    res.status(200).json({
      archive,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "خطای ناشناخته.";

    res.status(400).json({
      message,
    });
  }
}