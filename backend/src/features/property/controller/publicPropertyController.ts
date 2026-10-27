import type { Request, Response } from "express";

import { getPublishedPublicPropertyById } from "../service/publicPropertyService";

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
    const property = await getPublishedPublicPropertyById(req.params.id);
    return res.status(200).json(property);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "آگهی عمومی موردنظر پیدا نشد.";

    return res.status(404).json({ message });
  }
}
