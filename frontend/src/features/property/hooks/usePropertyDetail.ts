"use client";

import { useEffect, useState } from "react";

interface PropertyListing {
  id: string;
  propertyId: string;
  transactionType: string;
  salePrice?: string | null;
  depositAmount?: string | null;
  rentAmount?: string | null;
  status: string;
  publishedAt?: string | null;
  rejectedAt?: string | null;
  expiredAt?: string | null;
}

/**
 * ============================================================
 * نوع اطلاعات ملک
 * ============================================================
 *
 * ساختار پاسخ:
 *
 * GET /properties/:id
 *
 * شامل:
 *
 * Property
 * +
 * listing
 * ============================================================
 */
interface Property {
  id: string;
  propertyType: string;
  registrationSource?: string;
  city: string;
  district: string;
  address?: string | null;
  postalCode?: string | null;
  area?: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  floor?: number | null;
  description?: string | null;
  latitudePublic?: number | null;
  longitudePublic?: number | null;
  isActive: boolean;

  /**
   * Listing فعلی ملک
   *
   * قیمت فعلی در این بخش قرار دارد.
   */
  listing?: PropertyListing | null;
}



type LoadState = "loading" | "loaded" | "not-found" | "error";

function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

/**
 * دریافت اطلاعات عمومی ملک و مدیریت وضعیت‌های بارگذاری، خطا و پیدا نشدن.
 * قرارداد endpoint و رفتار درخواست عمداً بدون تغییر نگه داشته شده‌اند.
 */
export function usePropertyDetail() {
  const [property, setProperty] = useState<Property | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    let id = lastSegment || "";

    try {
      id = decodeURIComponent(id);
    } catch {
      // اگر قسمت URL کدگذاری نامعتبر داشته باشد، همان مقدار رد می‌شود.
    }

    if (!id || id === "__csr__") {
      setLoadState("not-found");
      return;
    }

    const controller = new AbortController();

    async function loadProperty() {
      try {
        const response = await fetch(
          `${getPublicApiUrl()}/properties/${encodeURIComponent(id)}/public`,
          { cache: "no-store", signal: controller.signal }
        );

        if (response.status === 404) {
          setProperty(null);
          setLoadState("not-found");
          return;
        }
        if (!response.ok) {
          throw new Error(`خطا در دریافت ملک: ${response.status}`);
        }

        const result: Property = await response.json();
        setProperty(result);
        setLoadState("loaded");
      } catch {
        if (controller.signal.aborted) return;
        setLoadState("error");
      }
    }

    void loadProperty();
    return () => controller.abort();
  }, []);

  return { property, loadState };
}
