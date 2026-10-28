/**
 * ============================================================
 * Property Controller
 * ============================================================
 *
 * Controller مسئول دریافت Request و ارسال Response است.
 *
 * منطق Business در Service قرار دارد و Controller نباید
 * منطق مربوط به Property را خودش انجام دهد.
 * ============================================================
 */

import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

import {
  getPropertyById,
  registerProperty,
} from "../service/propertyService";

/**
 * ============================================================
 * ثبت ملک
 * ============================================================
 */
export async function registerPropertyController(
  req: Request,
  res: Response
) {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // نقش و مشخصات ثبت‌کننده فقط از نشست معتبر پذیرفته می‌شوند.
  if (user.role !== "OWNER" && user.role !== "AGENT") {
    return res.status(403).json({ message: "نقش ثبت‌کننده مجاز نیست." });
  }

  try {
    // شناسه پروفایل مخالف نقش سشن را از ورودی حذف می‌کنیم.
    const { ownerId, agentId, ...propertyData } = req.body ?? {};
    const registrationData = {
      ...propertyData,
      ...(user.role === "OWNER" ? { ownerId } : { agentId }),
    };

    const result = await registerProperty(registrationData, {
      id: user.id,
      mobile: user.mobile,
      role: user.role,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "خطای ناشناخته در ثبت ملک",
    });
  }
}

/**
 * ============================================================
 * دریافت جزئیات یک ملک
 * ============================================================
 *
 * GET /properties/:id
 *
 * نکته:
 *
 * در این Route می‌دانیم که id یک string است.
 * بنابراین نوع Params را به Request اعلام می‌کنیم.
 */
export async function getPropertyByIdController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const property = await getPropertyById(req.params.id);
    const user = (req as AuthenticatedRequest).user;

    // جزئیات دقیق برای نقش مشتری پنهان است؛ سایر نقش‌های احراز هویت‌شده آن را می‌بینند.
    if (user?.role === "CUSTOMER") {
      const {
        latitudeExact: _latitudeExact,
        longitudeExact: _longitudeExact,
        ...customerVisibleProperty
      } = property;
      return res.status(200).json(customerVisibleProperty);
    }

    return res.status(200).json(property);
  } catch (error: any) {
    res.status(404).json({
      message: error.message || "ملک مورد نظر پیدا نشد.",
    });
  }
}