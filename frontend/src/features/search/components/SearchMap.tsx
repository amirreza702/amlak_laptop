
/**
 * ============================================================
 * SearchMap
 * ============================================================
 *
 * نقشه واقعی جستجوی ملک.
 *
 * وظایف:
 *
 * 1. بارگذاری RealMap در سمت Client
 * 2. دریافت محدوده فعلی نقشه
 * 3. دریافت فیلترهای اعمال‌شده
 * 4. دریافت نتایج واقعی جستجو از Backend
 * 5. ارسال اطلاعات به RealMap
 * ============================================================
 */

"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import type {
  PropertySearchResult,
  PropertySearchState,
} from "../hooks/usePropertySearch";

import type { MapBounds } from "@/shared/components/map/MapViewport";

/**
 * بارگذاری RealMap فقط در Client
 *
 * Leaflet به window نیاز دارد و نباید در SSR اجرا شود.
 */
const RealMap = dynamic(
  () =>
    import("@/shared/components/map/RealMap").then(
      (mod) => mod.RealMap
    ),
  {
    ssr: false,
  }
);

interface SearchMapProps {
  /**
   * آخرین فیلترهایی که کاربر واقعاً اعمال کرده است.
   */
  appliedFilters: PropertySearchState;

  /**
   * نتایج واقعی برگشتی از Backend.
   */
  results: PropertySearchResult[];
}

export function SearchMap({
  appliedFilters,
  results,
}: SearchMapProps) {
  /**
   * محدوده فعلی نقشه
   */
  const [mapBounds, setMapBounds] =
    useState<MapBounds | null>(null);

  /**
   * دریافت محدوده جدید نقشه
   *
   * مقایسه انجام می‌دهیم تا از Update Loop جلوگیری شود.
   */
  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      setMapBounds((previousBounds) => {
        if (!previousBounds) {
          return bounds;
        }

        const hasChanged =
          previousBounds.north !== bounds.north ||
          previousBounds.south !== bounds.south ||
          previousBounds.east !== bounds.east ||
          previousBounds.west !== bounds.west;

        if (!hasChanged) {
          return previousBounds;
        }

        return bounds;
      });
    },
    []
  );

  return (
    <div
      className="
        absolute
        inset-0
        z-0
        overflow-hidden
      "
    >
      <RealMap
        bounds={mapBounds}
        appliedFilters={appliedFilters}
        results={results}
        onBoundsChange={handleBoundsChange}
      />

      {/* لایه بسیار ملایم روی نقشه */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-[1]
          bg-white/5
        "
      />
    </div>
  );
}
