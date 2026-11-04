"use client";

import Link from "next/link";

import {
  Polygon,
  Popup,
} from "react-leaflet";

import type { MapProperty } from "./map/RealMap";

interface MapPropertyMarkerProps {
  property: MapProperty;
  onSelect?: (property: MapProperty) => void;
}

/**
 * Build a stable, slightly irregular public area (maximum radius 500m).
 * The public point is deliberately not drawn as a center marker.
 */
function getApproximateAreaPositions(
  property: MapProperty
): Array<[number, number]> {
  const seed = Array.from(property.id).reduce(
    (value, character) => (Math.imul(value, 31) + character.charCodeAt(0)) | 0,
    7
  );
  const latitudeRadians = (property.latitude * Math.PI) / 180;
  const longitudeScale = Math.max(Math.abs(Math.cos(latitudeRadians)), 0.2);
  const vertexCount = 16;

  return Array.from({ length: vertexCount }, (_, index) => {
    const raw = Math.sin((seed + 1) * 0.0001 + (index + 1) * 127.1) * 43758.5453;
    const random = raw - Math.floor(raw);
    const angle = (index / vertexCount) * Math.PI * 2;
    const radiusMeters = 420 + random * 80;
    const latitudeOffset = (Math.cos(angle) * radiusMeters) / 111_320;
    const longitudeOffset =
      (Math.sin(angle) * radiusMeters) / (111_320 * longitudeScale);

    return [
      property.latitude + latitudeOffset,
      property.longitude + longitudeOffset,
    ];
  });
}

/**
 * نمایش محدوده تقریبی آگهی روی نقشه.
 *
 * عمداً نقطه مرکزی یا نشانگر موقعیت نمایش داده نمی‌شود؛
 * کلیک روی خود محدوده، اطلاعات آگهی را باز می‌کند.
 */
export function MapPropertyMarker({
  property,
  onSelect,
}: MapPropertyMarkerProps) {
  const areaPositions = getApproximateAreaPositions(property);

  return (
    <Polygon
      positions={areaPositions}
      pathOptions={{
        color: "#0f766e",
        weight: 1.5,
        opacity: 0.7,
        fillColor: "#14b8a6",
        fillOpacity: 0.09,
        dashArray: "5 7",
      }}
      eventHandlers={{
        click: () => {
          onSelect?.(property);
        },
      }}
    >
      <Popup
        autoPan={true}
        autoPanPaddingTopLeft={[15, 130]}
        autoPanPaddingBottomRight={[80, 110]}
      >
        <div
          dir="rtl"
          className="min-w-[210px] space-y-3 text-right"
        >
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

          <div className="text-xs text-slate-500">
            {property.location}
          </div>

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
