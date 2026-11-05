"use client";

import Link from "next/link";
import { Circle, Popup } from "react-leaflet";

import type { MapProperty } from "./map/RealMap";

interface MapPropertyMarkerProps {
  property: MapProperty;
  onSelect?: (property: MapProperty) => void;
}

/**
 * محدوده عمومی دایره‌ای آگهی با شعاع دقیق ۳۰۰ متر حول مختصات عمومی.
 * هیچ نشانگری برای مرکز عمومی یا موقعیت دقیق ملک رسم نمی‌شود.
 */
export function MapPropertyMarker({
  property,
  onSelect,
}: MapPropertyMarkerProps) {
  return (
    <Circle
      center={[property.latitude, property.longitude]}
      radius={300}
      pathOptions={{
        color: "#ea580c",
        weight: 2,
        opacity: 0.95,
        fillColor: "#fb923c",
        fillOpacity: 0.16,
        dashArray: "6 5",
      }}
      eventHandlers={{
        click: () => onSelect?.(property),
      }}
    >
      <Popup
        autoPan
        autoPanPaddingTopLeft={[15, 130]}
        autoPanPaddingBottomRight={[80, 110]}
      >
        <div dir="rtl" className="min-w-[210px] space-y-3 text-right">
          {property.mainImage && (
            <img
              src={property.mainImage}
              alt={property.title}
              className="mb-2 h-28 w-full rounded-lg bg-slate-100 object-cover"
              loading="lazy"
            />
          )}
          <div className="text-sm font-bold text-slate-900">
            {property.title}
          </div>
          <div className="text-xs text-slate-500">{property.location}</div>
          <div className="flex gap-3 text-xs text-slate-600">
            <span>{property.area} متر</span>
            {property.rooms > 0 && <span>{property.rooms} خواب</span>}
          </div>
          <div className="pt-1 text-sm font-bold text-slate-900">
            {property.price}
          </div>
          <Link
            href={`/property/${property.id}`}
            className="block border-t border-slate-200 pt-2 text-sm font-bold text-brand-turquoise transition-colors hover:text-slate-900"
          >
            مشاهده جزئیات ملک ←
          </Link>
        </div>
      </Popup>
    </Circle>
  );
}
