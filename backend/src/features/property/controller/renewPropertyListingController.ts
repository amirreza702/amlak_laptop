import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";
import { renewExpiredPropertyListing } from "../service/renewPropertyListingService";

export async function renewPropertyListingController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return res.status(401).json({ message: "Authentication required" });
  try {
    const result = await renewExpiredPropertyListing(req.params.id, {
      id: user.id,
      role: user.role,
    });
    return res.status(200).json({ message: "انتشار ملک برای ۳۱ روز تمدید شد.", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const known: Record<string, [number, string]> = {
      PROPERTY_OR_LISTING_NOT_FOUND: [404, "ملک یا آگهی پیدا نشد."],
      PROPERTY_RENEWAL_FORBIDDEN: [403, "فقط مالک یا مشاور تأییدشده همان ملک مجاز به تمدید است."],
      INACTIVE_PROPERTY_CANNOT_BE_RENEWED: [409, "ملک غیرفعال است و امکان تمدید انتشار ندارد."],
      PROPERTY_LISTING_NOT_EXPIRED: [409, "این آگهی منقضی نشده یا قبلاً تمدید شده است."],
    };
    const found = known[message];
    if (found) return res.status(found[0]).json({ message: found[1] });
    console.error("Property listing renewal failed:", error);
    return res.status(500).json({ message: "تمدید انتشار ملک ناموفق بود." });
  }
}
