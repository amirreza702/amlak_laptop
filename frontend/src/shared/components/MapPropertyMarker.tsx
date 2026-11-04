"use client";

import Link from "next/link";
import { Polygon, Popup } from "react-leaflet";

import type { MapProperty } from "./map/RealMap";

interface MapPropertyMarkerProps {
  property: MapProperty;
  onSelect?: (property: MapProperty) => void;
}

/**
 * محدوده عمومی نامنظم آگهی؛ هیچ نقطه مرکزی روی نقشه رسم نمی‌شود.
 * تمام رأس‌ها حداکثر ۲۵۰ متر از مختصات عمومی فاصله دارند.
 */
function getApproximateAreaPositions(
  property: MapProperty
): Array<[number, number]> {
  const seed = Array.from(property.id).reduce(
    (value, character) =>
      (Math.imul(value, 31) + character.charCodeAt(0)) | 0,
    7
  );
  const latitudeRadians = (property.latitude * Math.PI) / 180;
  const longitudeScale = Math.max(Math.abs(Math.cos(latitudeRadians)), 0.2);
  const vertexCount = 16;

  return Array.from({ length: vertexCount }, (_, index) => {
    const raw =
      Math.sin((seed + 1) * 0.0001 + (index + 1) * 127.1) * 43758.5453;
    const random = raw - Math.floor(raw);
    const angle = (index / vertexCount) * Math.PI * 2;
    const radiusMeters = 200 + random * 50;
    const latitudeOffset = (Math.cos(angle) * radiusMeters) / 111_320;
    const longitudeOffset =
      (Math.sin(angle) * radiusMeters) / (111_320 * longitudeScale);

    return [
      property.latitude + latitudeOffset,
      property.longitude + longitudeOffset,
    ];
  });
}

/** فقط برای آگهی انتخاب‌شده محدوده تقریبی را نمایش می‌دهد. */
export function MapPropertyMarker({
  property,
  onSelect,
}: MapPropertyMarkerProps) {
  return (
    <Polygon
      positions={getApproximateAreaPositions(property)}
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
    </Polygon>
  );
}
