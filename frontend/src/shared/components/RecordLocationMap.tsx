"use client";

import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

type RecordLocationMapProps = {
  latitude: number;
  longitude: number;
  label: string;
  precision: "EXACT" | "APPROXIMATE";
};

export default function RecordLocationMap({ latitude, longitude, label, precision }: RecordLocationMapProps) {
  return (
    <section className="space-y-2 sm:col-span-2">
      <h3 className="text-sm font-semibold text-slate-700">موقعیت روی نقشه</h3>
      <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-200" dir="ltr">
        <MapContainer
          center={[latitude, longitude]}
          zoom={16}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {precision === "EXACT" ? (
            <CircleMarker
              center={[latitude, longitude]}
              radius={9}
              pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
            >
              <Tooltip permanent>{label}</Tooltip>
            </CircleMarker>
          ) : (
            <Circle
              center={[latitude, longitude]}
              radius={300}
              pathOptions={{
                color: "#2563eb",
                weight: 2,
                fillColor: "#60a5fa",
                fillOpacity: 0.18,
              }}
            >
              <Tooltip sticky>{label}؛ شعاع محدوده ۳۰۰ متر</Tooltip>
            </Circle>
          )}
        </MapContainer>
      </div>
    </section>
  );
}
