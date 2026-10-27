
"use client";

import Link from "next/link";

import {
  CircleMarker,
  Popup,
} from "react-leaflet";

import type { MapProperty } from "./map/RealMap";

interface MapPropertyMarkerProps {
  property: MapProperty;
  onSelect?: (property: MapProperty) => void;
}

/**
 * نشانگر ملک روی نقشه
 *
 * با کلیک روی نشانگر:
 * - اطلاعات خلاصه ملک نمایش داده می‌شود.
 * - کاربر می‌تواند از طریق لینک، وارد صفحه جزئیات شود.
 *
 * عمداً از double-click استفاده نمی‌کنیم؛
 * چون double-click با Zoom نقشه تداخل دارد.
 */
export function MapPropertyMarker({
  property,
  onSelect,
}: MapPropertyMarkerProps) {
  return (
    <CircleMarker
      center={[
        property.latitude,
        property.longitude,
      ]}
      radius={9}
      pathOptions={{
        fillColor: "#0f172a",
        fillOpacity: 0.95,
        color: "#ffffff",
        weight: 3,
      }}
      eventHandlers={{
        click: () => {
          onSelect?.(property);
        },
      }}
    >
      {/*
        Popup اطلاعات خلاصه ملک

        offset باعث می‌شود Popup کمی از محل
        دقیق نشانگر فاصله داشته باشد.

        فعلاً direction را حذف کرده‌ایم تا
        با TypeScript/react-leaflet خطا نداشته باشد.
      */}
      <Popup
      offset={[0, 10]}
      autoPan={true}
      autoPanPaddingTopLeft={[15, 130]}
      autoPanPaddingBottomRight={[80, 110]}
      >
        <div
          dir="rtl"
          className="
            min-w-[210px]
            space-y-3
            text-right
          "
        >
          {/* عنوان ملک */}
          <div
            className="
              text-sm
              font-bold
              text-slate-900
            "
          >
            {property.title}
          </div>

          {/* محل ملک */}
          <div
            className="
              text-xs
              text-slate-500
            "
          >
            {property.location}
          </div>

          {/* متراژ و تعداد خواب */}
          <div
            className="
              flex
              gap-3
              text-xs
              text-slate-600
            "
          >
            <span>
              {property.area} متر
            </span>

            {property.rooms > 0 && (
              <span>
                {property.rooms} خواب
              </span>
            )}
          </div>

          {/* قیمت */}
          <div
            className="
              pt-1
              text-sm
              font-bold
              text-slate-900
            "
          >
            {property.price}
          </div>

          {/*
            لینک ورود به صفحه جزئیات ملک
          */}
          <Link
            href={`/property/${property.id}`}
            className="
              block
              border-t
              border-slate-200
              pt-2
              text-sm
              font-bold
              text-brand-turquoise
              transition-colors
              hover:text-slate-900
            "
          >
            مشاهده جزئیات ملک ←
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  );
}
