/**
 * ============================================================
 * Update Property Listing Status Input
 * ============================================================
 *
 * قرارداد ورودی برای تغییر وضعیت PropertyListing.
 *
 * شناسه Listing از مسیر API دریافت خواهد شد.
 *
 * مثال:
 *
 * PUT /properties/:id/status
 *
 * بنابراین propertyId در این قرارداد قرار نمی‌گیرد.
 *
 * ============================================================
 */

import type { ListingStatus } from "@prisma/client";

/**
 * ============================================================
 * ورودی تغییر وضعیت Listing
 * ============================================================
 *
 * وضعیت جدیدی که Listing باید به آن منتقل شود.
 */
export interface UpdatePropertyListingStatusInput {
  status: ListingStatus;
}