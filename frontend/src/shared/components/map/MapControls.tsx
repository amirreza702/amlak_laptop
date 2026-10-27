
"use client";

/**
 * =========================================================
 * MapControls
 * =========================================================
 *
 * کنترل‌های نقشه:
 *
 * +       بزرگنمایی
 * -       کوچک‌نمایی
 * GPS     پیدا کردن موقعیت فعلی کاربر
 *
 * موقعیت GPS از Geolocation API / Leaflet گرفته می‌شود.
 *
 * همچنین:
 * - موقعیت کاربر به صورت نقطه آبی نمایش داده می‌شود.
 * - با هر بار دریافت موقعیت جدید، نقطه قبلی به‌روزرسانی می‌شود.
 * - یک هاله ظریف اطراف نقطه برای شبیه شدن به Google Maps
 *   نمایش داده می‌شود.
 *
 * =========================================================
 */

import { useEffect, useRef } from "react";

import L from "leaflet";

import {
  LocateFixed,
  Minus,
  Plus,
} from "lucide-react";

import { useMap } from "react-leaflet";

/**
 * =========================================================
 * Props
 * =========================================================
 */

interface MapControlsProps {
  /**
   * فعلاً برای حفظ ساختار پروژه نگه داشته شده است.
   *
   * در مراحل بعد می‌توان از آن برای:
   * - fitBounds
   * - محاسبه محدوده املاک
   * - نمایش نتایج جستجو
   * استفاده کرد.
   */
  properties?: unknown[];
}

/**
 * =========================================================
 * MapControls Component
 * =========================================================
 */

export function MapControls({
  properties = [],
}: MapControlsProps) {
  /**
   * -------------------------------------------------------
   * دریافت instance واقعی نقشه Leaflet
   * -------------------------------------------------------
   */
  const map = useMap();

  /**
   * -------------------------------------------------------
   * Reference مربوط به Marker موقعیت کاربر
   *
   * چرا useRef؟
   *
   * چون نمی‌خواهیم با هر تغییر موقعیت GPS،
   * یک Marker جدید بدون حذف قبلی ساخته شود.
   *
   * بنابراین همان Marker قبلی را نگه می‌داریم
   * و فقط مختصات آن را تغییر می‌دهیم.
   * -------------------------------------------------------
   */
  const userMarkerRef =
    useRef<L.CircleMarker | null>(null);

  /**
   * -------------------------------------------------------
   * Reference مربوط به هاله اطراف موقعیت کاربر
   * -------------------------------------------------------
   */
  const userAccuracyRef =
    useRef<L.CircleMarker | null>(null);

  /**
   * -------------------------------------------------------
   * Zoom In
   * -------------------------------------------------------
   */

  const handleZoomIn = () => {
    map.zoomIn();
  };

  /**
   * -------------------------------------------------------
   * Zoom Out
   * -------------------------------------------------------
   */

  const handleZoomOut = () => {
    map.zoomOut();
  };

  /**
   * =======================================================
   * GPS
   * =======================================================
   *
   * این بخش مسئول دریافت موقعیت GPS و نمایش نقطه آبی است.
   *
   * Listenerهای Leaflet فقط یک بار هنگام mount شدن
   * کامپوننت ثبت می‌شوند.
   * =======================================================
   */

  useEffect(() => {
    /**
     * -----------------------------------------------------
     * وقتی GPS موقعیت جدید پیدا کرد
     * -----------------------------------------------------
     */
    const handleLocationFound = (
      event: L.LocationEvent
    ) => {
      /**
       * مختصات جدید کاربر
       */
      const { lat, lng } = event.latlng;

      /**
       * ===================================================
       * اگر Marker قبلاً ساخته نشده:
       *
       * Marker اصلی و هاله آن را ایجاد می‌کنیم.
       * ===================================================
       */

      if (!userMarkerRef.current) {
        /**
         * -------------------------------------------------
         * نقطه اصلی آبی
         * -------------------------------------------------
         */
        userMarkerRef.current =
          L.circleMarker(
            [lat, lng],
            {
              /**
               * اندازه نقطه
               */
              radius: 8,

              /**
               * رنگ آبی مشابه Google Maps
               */
              fillColor: "#4285F4",

              /**
               * حاشیه سفید
               */
              color: "#FFFFFF",

              /**
               * ضخامت حاشیه
               */
              weight: 3,

              /**
               * کاملاً قابل مشاهده
               */
              fillOpacity: 1,

              /**
               * نقطه کاربر نباید جلوی کلیک
               * روی Markerهای ملک را بگیرد.
               */
              interactive: false,
            }
          ).addTo(map);

        /**
         * -------------------------------------------------
         * هاله اطراف نقطه
         * -------------------------------------------------
         *
         * این هاله دقت GPS را نشان نمی‌دهد؛
         * صرفاً برای ظاهر بهتر و شبیه شدن به
         * Google Maps استفاده شده است.
         */
        userAccuracyRef.current =
          L.circleMarker(
            [lat, lng],
            {
              radius: 16,

              color: "#4285F4",

              weight: 1,

              fillColor: "#4285F4",

              fillOpacity: 0.15,

              /**
               * هاله نباید مانع تعامل با نقشه شود.
               */
              interactive: false,
            }
          ).addTo(map);
      } else {
        /**
         * =================================================
         * اگر Marker قبلاً وجود دارد:
         *
         * فقط موقعیت آن را تغییر می‌دهیم.
         * =================================================
         */

        userMarkerRef.current.setLatLng([
          lat,
          lng,
        ]);

        /**
         * به‌روزرسانی هاله
         */
        userAccuracyRef.current?.setLatLng([
          lat,
          lng,
        ]);
      }
    };

    /**
     * -----------------------------------------------------
     * اگر دریافت GPS با خطا مواجه شد
     * -----------------------------------------------------
     *
     * فعلاً کاری نمی‌کنیم.
     *
     * بعداً می‌توانیم:
     * - پیام خطا
     * - Toast
     * - درخواست فعال کردن Location
     * اضافه کنیم.
     */
    const handleLocationError = (
      _event: L.ErrorEvent
    ) => {
      // فعلاً هیچ کاری انجام نمی‌دهیم.
    };

    /**
     * ثبت Eventهای Leaflet
     */
    map.on(
      "locationfound",
      handleLocationFound
    );

    map.on(
      "locationerror",
      handleLocationError
    );

    /**
     * -----------------------------------------------------
     * Cleanup
     * -----------------------------------------------------
     *
     * هنگام خروج کامپوننت:
     *
     * - Eventها حذف می‌شوند.
     * - Marker کاربر حذف می‌شود.
     * - هاله حذف می‌شود.
     * -----------------------------------------------------
     */

    return () => {
      map.off(
        "locationfound",
        handleLocationFound
      );

      map.off(
        "locationerror",
        handleLocationError
      );

      if (userMarkerRef.current) {
        map.removeLayer(
          userMarkerRef.current
        );

        userMarkerRef.current = null;
      }

      if (userAccuracyRef.current) {
        map.removeLayer(
          userAccuracyRef.current
        );

        userAccuracyRef.current = null;
      }
    };
  }, [map]);

  /**
   * =======================================================
   * Locate User
   * =======================================================
   */

  const handleLocate = () => {
    /**
     * از قابلیت Geolocation خود Leaflet استفاده می‌کنیم.
     *
     * setView:
     * نقشه بعد از دریافت GPS روی موقعیت کاربر می‌رود.
     *
     * maxZoom:
     * حداکثر Zoom هنگام رفتن به موقعیت کاربر.
     *
     * enableHighAccuracy:
     * درخواست موقعیت دقیق‌تر از دستگاه.
     */
    map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  };

  /**
   * =======================================================
   * Render
   * =======================================================
   */

  return (
    <div
      className="
        absolute
        bottom-5
        left-4
        z-[1000]
        flex
        flex-col
        gap-2
      "
      dir="ltr"
    >
      {/* =================================================
          Zoom In
         ================================================= */}

      <button
        type="button"
        onClick={handleZoomIn}
        aria-label="بزرگنمایی نقشه"
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-white
          text-slate-700
          shadow-lg
          transition-all
          hover:bg-slate-50
          hover:shadow-xl
          active:scale-95
        "
      >
        <Plus
          className="h-5 w-5"
          strokeWidth={2.2}
        />
      </button>

      {/* =================================================
          Zoom Out
         ================================================= */}

      <button
        type="button"
        onClick={handleZoomOut}
        aria-label="کوچکنمایی نقشه"
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-white
          text-slate-700
          shadow-lg
          transition-all
          hover:bg-slate-50
          hover:shadow-xl
          active:scale-95
        "
      >
        <Minus
          className="h-5 w-5"
          strokeWidth={2.2}
        />
      </button>

      {/* =================================================
          GPS
         ================================================= */}

      <button
        type="button"
        onClick={handleLocate}
        aria-label="موقعیت فعلی من"
        title="موقعیت فعلی من"
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-white
          text-slate-700
          shadow-lg
          transition-all
          hover:bg-slate-50
          hover:shadow-xl
          active:scale-95
        "
      >
        <LocateFixed
          className="h-5 w-5"
          strokeWidth={2}
        />
      </button>
    </div>
  );
}

