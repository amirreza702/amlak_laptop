"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

type RecordLocationMapProps = {
  latitude: number;
  longitude: number;
  label: string;
};

export default function RecordLocationMap({ latitude, longitude, label }: RecordLocationMapProps) {
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
          <CircleMarker
            center={[latitude, longitude]}
            radius={9}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
          >
            <Tooltip permanent>{label}</Tooltip>
          </CircleMarker>
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500" dir="ltr">
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
    </section>
  );
}
