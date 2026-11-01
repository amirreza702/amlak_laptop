import type { Request, Response } from "express";

import { getPublishedPublicPropertyById } from "../service/publicPropertyService";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

/**
 * GET /properties/:id/public
 *
 * این Endpoint فقط داده‌های قابل نمایش عمومی آگهی را برمی‌گرداند.
 * Endpoint جزئیات احراز هویت‌شده قبلی بدون تغییر باقی می‌ماند.
 */
export async function getPublicPropertyByIdController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as AuthenticatedRequest).user;
    // پاسخ شخصی‌سازی‌شده نباید در cache مشترک بین مالک، مشاور و بازدیدکننده ذخیره شود.
    res.setHeader("Cache-Control", "private, no-store");
    res.vary("Cookie");
    const property = await getPublishedPublicPropertyById(
      req.params.id,
      user ? { id: user.id, role: user.role } : undefined
    );
    const apiBase = (process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    return res.status(200).json({
      ...property,
      media: property.media.map((item) => ({
        ...item,
        url: item.url.startsWith("http") ? item.url : apiBase + item.url,
      })),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "آگهی عمومی موردنظر پیدا نشد.";

    return res.status(404).json({ message });
  }
}
