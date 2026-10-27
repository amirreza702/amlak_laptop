import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { getCurrentCustomerProfile } from "../service/currentCustomerProfileService";

/**
 * GET /customers/me/profile
 * شناسه User فقط از Session معتبر خوانده می‌شود.
 */
export async function getCurrentCustomerProfileController(
  req: Request,
  res: Response
) {
  const user = (req as AuthenticatedRequest).user;

  // مسیر باید از authMiddleware عبور کند؛ این بررسی خطای پیکربندی را نیز مهار می‌کند.
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const profile = await getCurrentCustomerProfile(user.id);
    return res.status(200).json(profile);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Customer not found") {
      return res.status(404).json({ message: "Customer profile not found" });
    }

    console.error("Error getting current customer profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
