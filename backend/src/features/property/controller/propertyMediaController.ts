import type { Request, Response } from "express";

import {
  createPropertyMediaService,
  getPropertyMediaService,
  getPropertyMediaFileService,
} from "../service/propertyMediaService";

import { MediaType } from "@prisma/client";

/**
 * ============================================================
 * Create Property Media Controller
 * ============================================================
 *
 * POST /properties/:id/media
 */
export async function createPropertyMediaController(
  req: Request<
    { id: string },
    unknown,
    {
      type: MediaType;
      imageData: string;
      sortOrder?: number;
    }
  >,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const {
      type,
      imageData,
      sortOrder,
    } = req.body;

    const propertyMedia =
      await createPropertyMediaService({
        propertyId,
        type,
        url,
        sortOrder,
      });

    return res.status(201).json({
      propertyMedia,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در ثبت رسانه ملک رخ داد.",
    });
  }
}

/**
 * ============================================================
 * Get Property Media Controller
 * ============================================================
 *
 * GET /properties/:id/media
 */
export async function getPropertyMediaController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const propertyMedia =
      await getPropertyMediaService(propertyId);

    return res.status(200).json({
      propertyMedia,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در دریافت رسانه‌های ملک رخ داد.",
    });
  }
}

export async function getPublicPropertyMediaContentController(req: Request<{ mediaId: string }>, res: Response) {
  try {
    const file = await getPropertyMediaFileService(req.params.mediaId, undefined, true);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.end(file.bytes);
  } catch {
    res.status(404).json({ message: "تصویر عمومی پیدا نشد." });
  }
}
