"use client";

import { useEffect, useState } from "react";

export interface PropertyListing {
  transactionType: string;
  salePrice?: string | null;
  depositAmount?: string | null;
  rentAmount?: string | null;
}

export interface PropertyMedia {
  type: string;
  url: string;
  sortOrder: number;
}

export interface PropertyContact {
  type: "AGENT" | "OWNER";
  label: "مشاور ثبت‌کننده" | "مشاور تأییدشده" | "مالک";
  firstName: string;
  lastName: string;
  mobile: string;
}

export interface PropertyOwnerDetails {
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
}

/**
 * فقط فیلدهای مجاز صفحه جزئیات عمومی جستجوی ملک.
 * آدرس دقیق، کد پستی، مختصات، یادداشت‌ها و اطلاعات سیستمی عمداً در این نوع نیستند.
 */
export interface Property {
  id: string;
  propertyType: string;
  city: string;
  district: string;
  area?: number | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  floor?: number | null;
  unitNumber?: string | null;
  totalUnits?: number | null;
  parkingCount?: number | null;
  parkingType?: string | null;
  hasElevator?: boolean | null;
  hasStorage?: boolean | null;
  hasBalcony?: boolean | null;
  hasYard?: boolean | null;
  heatingSystem?: string | null;
  coolingSystem?: string | null;
  documentType?: string | null;
  ownershipType?: string | null;
  landTenure?: string | null;
  description?: string | null;
  renovationStatus?: string | null;
  renovationYear?: number | null;
  occupancyStatus?: string | null;
  isActive: boolean;
  media: PropertyMedia[];
  contact?: PropertyContact | null;
  ownerDetails?: PropertyOwnerDetails | null;
  listing?: PropertyListing | null;
}

type LoadState = "loading" | "loaded" | "not-found" | "error";

function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

/**
 * دریافت جزئیات عمومی ملک با حفظ endpoint و رفتار احراز هویت اختیاری.
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
      // URL نامعتبر در ادامه به وضعیت پیدا نشدن تبدیل می‌شود.
    }

    if (!id || id === "__csr__") {
      void Promise.resolve().then(() => setLoadState("not-found"));
      return;
    }

    const controller = new AbortController();

    async function loadProperty() {
      try {
        const response = await fetch(
          `${getPublicApiUrl()}/properties/${encodeURIComponent(id)}/public`,
          { cache: "no-store", credentials: "include", signal: controller.signal }
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
