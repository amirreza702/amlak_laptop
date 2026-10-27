"use client";

/**
 * =========================================================
 * MapViewport
 * =========================================================
 *
 * وظیفه:
 * 1. دریافت محدوده فعلی نقشه از Leaflet
 * 2. اعلام محدوده به کامپوننت والد
 *
 * این کامپوننت هیچ UI ندارد.
 * فقط مسئول ارتباط با viewport نقشه است.
 * =========================================================
 */

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/*
 * محدوده جغرافیایی فعلی نقشه
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapViewportProps {
  onBoundsChange?: (bounds: MapBounds) => void;
}

export function MapViewport({
  onBoundsChange,
}: MapViewportProps) {
  const map = useMap();

  useEffect(() => {
    /*
     * این تابع هر بار که محدوده نقشه تغییر کند
     * اجرا می‌شود.
     */
    const updateBounds = () => {
      const bounds = map.getBounds();

      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    /*
     * محدوده اولیه را بلافاصله دریافت می‌کنیم.
     */
    updateBounds();

    /*
     * حرکت نقشه
     */
    map.on("moveend", updateBounds);

    /*
     * تغییر Zoom
     */
    map.on("zoomend", updateBounds);

    /*
     * پاک‌سازی Eventها
     */
    return () => {
      map.off("moveend", updateBounds);
      map.off("zoomend", updateBounds);
    };
  }, [map, onBoundsChange]);

  /*
   * این کامپوننت چیزی روی صفحه نمایش نمی‌دهد.
   */
  return null;
}