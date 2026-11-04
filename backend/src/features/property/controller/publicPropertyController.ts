import type { Request, Response } from "express";

import { getPublishedPublicPropertyById } from "../service/publicPropertyService";

/**
 * GET /properties/:id/public
 *
 * این Endpoint همیشه فقط داده‌های عمومی آگهی را برمی‌گرداند؛
 * نقش و هویت نشست کاربر در پاسخ جستجو دخالت ندارد.
 * Endpoint جزئیات احراز هویت‌شده پنل‌ها بدون تغییر باقی می‌ماند.
 */
export async function getPublicPropertyByIdController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    // پاسخ عمومی و یکسان است؛ برای جلوگیری از ذخیره پاسخ در cache مشترک، no-store حفظ می‌شود.
    res.setHeader("Cache-Control", "private, no-store");
    const property = await getPublishedPublicPropertyById(req.params.id);
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
