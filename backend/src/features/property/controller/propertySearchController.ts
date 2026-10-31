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

    const apiBase = (process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const items = result.map((item) => ({
      ...item,
      mainImage: item.mainImage
        ? (item.mainImage.startsWith("http") ? item.mainImage : apiBase + item.mainImage)
        : null,
    }));
    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error: any) {
    res.status(400).json({
      message:
        error?.message ||
        "خطا در جستجوی ملک",
    });
  }
}