import type { Request, Response } from "express";

import {
  createPropertyMediaService,
  getPropertyMediaService,
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
      url: string;
      sortOrder?: number;
    }
  >,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const {
      type,
      url,
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