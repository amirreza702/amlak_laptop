"use client";

import { useState } from "react";
import type { Coordinates } from "../types/propertyRegistration";

interface LocationSearchResult {
  label: string;
  lat: number;
  lon: number;
}

interface UsePropertyLocationPickerOptions {
  value: Coordinates | null;
  onChange: (value: Coordinates | null) => void;
  city: string;
}

/** مدیریت جست‌وجوی مکان و انتخاب/پیش‌نمایش مختصات خارج از کامپوننت نقشه. */
export function usePropertyLocationPicker({ value, onChange, city }: UsePropertyLocationPickerOptions) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [preview, setPreview] = useState<Coordinates | null>(value);

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
        { headers: { Accept: "application/json" }, signal: controller.signal },
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

  function previewPosition(position: Coordinates) {
    setPreview(position);
    onChange(null);
    setSearchError("");
  }

  function selectPosition(position: Coordinates) {
    setPreview(position);
    onChange(position);
    setSearchError("موقعیت انتخاب شد و مختصات آن برای ثبت ملک تأیید شده است.");
  }

  function chooseSearchResult(position: Coordinates) {
    setPreview(position);
    onChange(null);
    setResults([]);
    setSearchError("مکان پیدا شد؛ برای تأیید نهایی، روی نقطه دقیق نقشه دابل‌کلیک کنید.");
  }

  return {
    query, setQuery, searching, searchError, setSearchError, results, preview,
    searchPlace, previewPosition, selectPosition, chooseSearchResult,
  };
}
