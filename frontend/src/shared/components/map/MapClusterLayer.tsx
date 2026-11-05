"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { CircleMarker, Marker, Popup, useMap } from "react-leaflet";

import type { MapProperty } from "./RealMap";

interface MapClusterLayerProps {
  properties: MapProperty[];
  selectedPropertyId: string | null;
  onSelect: (property: MapProperty) => void;
}

interface PropertyCluster {
  id: string;
  center: [number, number];
  properties: MapProperty[];
}

function buildClusters(
  map: L.Map,
  properties: MapProperty[],
  threshold = 54
): PropertyCluster[] {
  const projected = properties.map((property) => ({
    property,
    point: map.latLngToLayerPoint([property.latitude, property.longitude]),
  }));
  const consumed = new Set<string>();
  const clusters: PropertyCluster[] = [];

  for (const entry of projected) {
    if (consumed.has(entry.property.id)) continue;

    const members = projected.filter((candidate) => {
      if (consumed.has(candidate.property.id)) return false;
      return entry.point.distanceTo(candidate.point) <= threshold;
    });

    members.forEach(({ property }) => consumed.add(property.id));

    const latitude =
      members.reduce((sum, member) => sum + member.property.latitude, 0) /
      members.length;
    const longitude =
      members.reduce((sum, member) => sum + member.property.longitude, 0) /
      members.length;

    clusters.push({
      id: members.map(({ property }) => property.id).sort().join(":"),
      center: [latitude, longitude],
      properties: members.map(({ property }) => property),
    });
  }

  return clusters;
}

function createClusterIcon(count: number) {
  return L.divIcon({
    className: "hashti-map-cluster",
    html: `<div style="width:42px;height:42px;border:3px solid #fff;border-radius:50%;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;box-shadow:0 2px 10px rgba(15,23,42,.28)">${count}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

export function MapClusterLayer({
  properties,
  selectedPropertyId,
  onSelect,
}: MapClusterLayerProps) {
  const map = useMap();
  const [clusters, setClusters] = useState<PropertyCluster[]>([]);

  useEffect(() => {
    const refresh = () => setClusters(buildClusters(map, properties));
    refresh();
    map.on("moveend", refresh);
    map.on("zoomend", refresh);

    return () => {
      map.off("moveend", refresh);
      map.off("zoomend", refresh);
    };
  }, [map, properties]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.properties.length === 1) {
          const property = cluster.properties[0];
          const selected = property.id === selectedPropertyId;

          return (
            <CircleMarker
              key={cluster.id}
              center={cluster.center}
              radius={selected ? 9 : 7}
              pathOptions={{
                color: "#ffffff",
                weight: 2.5,
                fillColor: selected ? "#f97316" : "#0f766e",
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(property) }}
            >
              <Popup>
                <div dir="rtl" className="min-w-[190px] space-y-2 text-right">
                  <div className="font-bold text-slate-900">{property.title}</div>
                  <div className="text-xs text-slate-500">{property.location}</div>
                  <div className="text-xs text-slate-600">
                    {property.area} متر
                    {property.rooms > 0 ? ` · ${property.rooms} خواب` : ""}
                  </div>
                  <div className="text-sm font-bold text-slate-900">{property.price}</div>
                  <button
                    type="button"
                    onClick={() => onSelect(property)}
                    className="w-full border-t border-slate-200 pt-2 text-sm font-bold text-teal-700"
                  >
                    نمایش محدوده تقریبی
                  </button>
                  <Link
                    href={`/property/${property.id}`}
                    className="block border-t border-slate-200 pt-2 text-sm font-bold text-brand-turquoise transition-colors hover:text-slate-900"
                  >
                    مشاهده جزئیات ملک ←
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        }

        return (
          <Marker
            key={cluster.id}
            position={cluster.center}
            icon={createClusterIcon(cluster.properties.length)}
          >
            <Popup
              autoPan
              autoPanPaddingTopLeft={[15, 130]}
              autoPanPaddingBottomRight={[80, 110]}
            >
              <div dir="rtl" className="max-h-64 min-w-[220px] space-y-2 overflow-y-auto text-right">
                <div className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
                  {cluster.properties.length.toLocaleString("fa-IR")} آگهی در این محدوده
                </div>
                {cluster.properties.map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => {
                      onSelect(property);
                      map.closePopup();
                      map.flyTo(
                        [property.latitude, property.longitude],
                        Math.min(18, Math.max(15, map.getZoom() + 1)),
                        { duration: 0.35 }
                      );
                    }}
                    className="block w-full rounded-lg border border-slate-200 p-2 text-right transition-colors hover:bg-teal-50"
                  >
                    <span className="block text-sm font-bold text-slate-800">
                      {property.title} · {property.area} متر
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {property.location} · {property.price}
                    </span>
                    <span className="mt-1 block text-xs font-bold text-teal-700">
                      انتخاب و نمایش محدوده
                    </span>
                  </button>
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
