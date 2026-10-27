import { Request, Response } from "express";

import { searchPropertyService } from "../service/propertySearchService";

/**
 * ============================================================
 * Search Property Controller
 * ============================================================
 *
 * GET /properties/search
 *
 * نمونه:
 *
 * /properties/search?city=شاهرود&propertyType=APARTMENT
 */

export async function searchPropertyController(
  req: Request,
  res: Response
) {
  try {
    const result = await searchPropertyService(
      req.query as Record<string, string | undefined>
    );

    res.status(200).json({
      count: result.length,
      items: result,
    });
  } catch (error: any) {
    res.status(400).json({
      message:
        error?.message ||
        "خطا در جستجوی ملک",
    });
  }
}