"use client";

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface PropertyCoordinates {
  latitude: number;
  longitude: number;
}

interface PropertyLocationPickerProps {
  value: PropertyCoordinates | null;
  onChange: (value: PropertyCoordinates | null) => void;
  city: string;
}

const defaultCenter: [number, number] = [36.4182, 54.9763];

function MapClickHandler({
  onPreview,
  onSelect,
}: {
  onPreview: (value: PropertyCoordinates) => void;
  onSelect: (value: PropertyCoordinates) => void;
}) {
  useMapEvents({
    click(event) {
      // کلیک معمولی فقط نشانگر پیش‌نمایش را جابه‌جا می‌کند؛ مختصات قبلی را نامعتبر می‌کنیم.
      onPreview({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
    dblclick(event) {
      // دابل‌کلیک تنها رویدادی است که موقعیت را برای ثبت ملک نهایی می‌کند.
      onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

/**
 * نقشه گاهی داخل پنل/بخش تازه بازشده اندازه واقعی والد را در شروع تشخیص نمی‌دهد.
 * تغییر اندازه ظرف را مشاهده می‌کنیم تا نقشه و کاشی‌ها کامل رندر شوند.
 */
function MapSizeHandler({ position }: { position: PropertyCoordinates | null }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;

    const invalidate = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
      });
    };

    invalidate();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(invalidate)
      : null;

    observer?.observe(container);
    window.addEventListener("resize", invalidate);
    const firstLayout = window.setTimeout(invalidate, 150);
    const secondLayout = window.setTimeout(invalidate, 500);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", invalidate);
      window.clearTimeout(firstLayout);
      window.clearTimeout(secondLayout);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [map]);

  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], Math.max(map.getZoom(), 15));
    }
  }, [map, position]);

  return null;
}

export default function PropertyLocationPicker({ value, onChange, city }: PropertyLocationPickerProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const [preview, setPreview] = useState<PropertyCoordinates | null>(value);

  async function searchPlace() {
    const term = query.trim();
    if (!term || searching) return;

    setSearching(true);
    setSearchError("");
    setResults([]);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const params = new URLSearchParams({
        q: [term, city.trim(), "ایران"].filter(Boolean).join(", "),
        format: "jsonv2",
        limit: "5",
        "accept-language": "fa",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error("سرویس جست‌وجوی مکان پاسخ مناسبی نداد. کمی بعد دوباره تلاش کنید یا نقطه را مستقیماً روی نقشه انتخاب کنید.");
      }

      const data = await response.json() as Array<{ display_name: string; lat: string; lon: string }>;
      const places = data
        .map((item) => ({ label: item.display_name, lat: Number(item.lat), lon: Number(item.lon) }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));

      setResults(places);
      if (places.length === 0) {
        setSearchError("مکانی پیدا نشد؛ عبارت دیگری جست‌وجو کنید یا نقطه را مستقیماً روی نقشه انتخاب کنید.");
      } else {
        // پس از جست‌وجو، نقشه فوراً به اولین نتیجه نزدیک می‌شود؛
        // فهرست نتایج هم باز می‌ماند تا کاربر در صورت نیاز محل دقیق‌تری برگزیند.
        const firstPlace = places[0];
        setPreview({ latitude: firstPlace.lat, longitude: firstPlace.lon });
        onChange(null);
        setSearchError("نقشه به محدوده مکان پیدا‌شده منتقل شد؛ برای انتخاب نتیجه دقیق‌تر، یکی از نشانی‌های فهرست را بزنید.");
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        setSearchError("پاسخ جست‌وجوی مکان بیش از ۱۲ ثانیه طول کشید. اتصال اینترنت یا دسترسی به سرویس نقشه را بررسی کنید؛ می‌توانید نقطه را مستقیماً روی نقشه انتخاب کنید.");
      } else {
        setSearchError(cause instanceof Error
          ? cause.message
          : "جست‌وجوی مکان ناموفق بود. می‌توانید نقطه را مستقیماً روی نقشه انتخاب کنید.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setSearching(false);
    }
  }

  const markerPosition = preview ?? value;
  const center: [number, number] = markerPosition
    ? [markerPosition.latitude, markerPosition.longitude]
    : defaultCenter;

  function previewPosition(position: PropertyCoordinates) {
    setPreview(position);
    onChange(null);
    setSearchError("");
  }

  function selectPosition(position: PropertyCoordinates) {
    setPreview(position);
    onChange(position);
    setSearchError("موقعیت انتخاب شد و مختصات آن برای ثبت ملک تأیید شده است.");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#043873]"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجوی نشانی یا مکان روی نقشه"
          aria-label="جست‌وجوی مکان روی نقشه"
        />
        <button
          type="button"
          onClick={() => void searchPlace()}
          disabled={searching || !query.trim()}
          className="rounded-xl bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {searching ? "در حال جست‌وجو..." : "جست‌وجو"}
        </button>
      </div>

      {searchError && <p role="status" className="text-xs leading-6 text-amber-800">{searchError}</p>}

      {results.length > 0 && (
        <ul className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-2">
          {results.map((item, index) => (
            <li key={`${item.lat}-${item.lon}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  const position = { latitude: item.lat, longitude: item.lon };
                  setPreview(position);
                  onChange(null);
                  setResults([]);
                  setSearchError("مکان پیدا شد؛ برای تأیید نهایی، روی نقطه دقیق نقشه دابل‌کلیک کنید.");
                }}
                className="w-full rounded-lg px-3 py-2 text-right text-sm leading-6 hover:bg-blue-50"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="h-80 min-h-80 w-full overflow-hidden rounded-xl border border-slate-300 sm:h-[28rem]">
        <MapContainer
          center={center}
          zoom={markerPosition ? 15 : 13}
          scrollWheelZoom
          doubleClickZoom={false}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setSearchError((current) => current || "بخشی از نقشه بارگذاری نشد؛ اتصال اینترنت یا دسترسی به سرور نقشه را بررسی کنید."),
            }}
          />
          <MapClickHandler onPreview={previewPosition} onSelect={selectPosition} />
          <MapSizeHandler position={markerPosition} />
          {markerPosition && (
            <CircleMarker
              center={[markerPosition.latitude, markerPosition.longitude]}
              radius={value ? 10 : 8}
              pathOptions={{
                color: value ? "#047857" : "#043873",
                fillColor: value ? "#10b981" : "#3b82f6",
                fillOpacity: 0.9,
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs leading-6 text-slate-500">
        کلیک معمولی فقط نشانگر موقت را جابه‌جا می‌کند. برای تأیید موقعیت ملک، روی نقطه دقیق نقشه دابل‌کلیک کنید. انتخاب از نتایج جست‌وجو نیز به‌تنهایی نهایی نیست.
      </p>

      {value ? (
        <div className="grid gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 sm:grid-cols-2">
          <p>عرض جغرافیایی: <b dir="ltr" className="font-mono">{value.latitude.toFixed(6)}</b></p>
          <p>طول جغرافیایی: <b dir="ltr" className="font-mono">{value.longitude.toFixed(6)}</b></p>
          <p className="sm:col-span-2 font-bold">موقعیت نهایی انتخاب شده است.</p>
        </div>
      ) : markerPosition ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          نشانگر موقت است؛ برای نهایی‌کردن موقعیت، روی همان نقطه دابل‌کلیک کنید.
        </div>
      ) : (
        <p className="text-sm text-amber-800">هنوز موقعیت نهایی انتخاب نشده است.</p>
      )}
    </div>
  );
}
