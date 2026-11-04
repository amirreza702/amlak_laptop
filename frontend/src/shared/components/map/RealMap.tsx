
"use client";

/**
 * ============================================================
 * RealMap
 * ============================================================
 *
 * نقشه واقعی جستجوی ملک
 *
 * داده ملک‌ها مستقیماً از Backend دریافت می‌شوند.
 *
 * دیگر هیچ MOCK_PROPERTY در این فایل وجود ندارد.
 * ============================================================
 */

import "leaflet/dist/leaflet.css";

import { useMemo, useState } from "react";

import {
  MapContainer,
  TileLayer,
} from "react-leaflet";

import type {
  PropertySearchResult,
  PropertySearchState,
} from "@/features/search/types/search";

import { MapPropertyMarker } from "../MapPropertyMarker";

import { MapControls } from "./MapControls";
import { MapClusterLayer } from "./MapClusterLayer";

import {
  MapViewport,
  type MapBounds,
} from "./MapViewport";

/**
 * ============================================================
 * نوع ملک روی نقشه
 * ============================================================
 */
export interface MapProperty {
  id: string;

  title: string;

  location: string;

  area: number;

  rooms: number;

  price: string;

  mainImage: string | null;

  latitude: number;

  longitude: number;

  transactionType?: string;

  propertyType?: string;

  priceValue?: number;

  bathrooms?: number;
}

/**
 * ============================================================
 * مرکز اولیه نقشه
 * ============================================================
 */
const SHAHRUD_CENTER: [number, number] = [
  36.4182,
  54.9763,
];

/**
 * ============================================================
 * تبدیل نوع معامله Backend به فارسی
 * ============================================================
 */
function getTransactionLabel(
  transactionType: string | null
): string {
  switch (transactionType) {
    case "SALE":
      return "فروش";

    case "FULL_DEPOSIT":
      return "رهن کامل";

    case "RENT":
      return "اجاره";

    case "DEPOSIT_AND_RENT":
      return "رهن و اجاره";

    default:
      return "";
  }
}

/**
 * ============================================================
 * تبدیل نوع ملک Backend به فارسی
 * ============================================================
 */
function getPropertyTypeLabel(
  propertyType: string
): string {
  switch (propertyType) {
    case "APARTMENT":
      return "آپارتمان";

    case "HOUSE":
      return "خانه";

    case "VILLA":
      return "ویلا";

    case "LAND":
      return "زمین";

    case "SHOP":
      return "مغازه";

    case "OFFICE":
      return "اداری";

    case "GARDEN":
      return "باغ";

    default:
      return propertyType;
  }
}

/**
 * ============================================================
 * تبدیل قیمت Backend به متن قابل نمایش
 * ============================================================
 */
function formatPrice(
  property: PropertySearchResult
): string {
  if (property.transactionType === "SALE") {
    if (property.salePrice) {
      return `${Number(
        property.salePrice
      ).toLocaleString("fa-IR")} تومان`;
    }
  }

  if (property.transactionType === "FULL_DEPOSIT") {
    if (property.depositAmount) {
      return `رهن ${Number(
        property.depositAmount
      ).toLocaleString("fa-IR")} تومان`;
    }
  }

  if (property.transactionType === "RENT" || property.transactionType === "DEPOSIT_AND_RENT") {
    const deposit = property.depositAmount
      ? `رهن ${Number(
          property.depositAmount
        ).toLocaleString("fa-IR")}`
      : "";

    const rent = property.rentAmount
      ? `اجاره ${Number(
          property.rentAmount
        ).toLocaleString("fa-IR")}`
      : "";

    return [deposit, rent]
      .filter(Boolean)
      .join(" / ");
  }

  return "قیمت نامشخص";
}

/**
 * ============================================================
 * تبدیل نتیجه Backend به ساختار MapProperty
 * ============================================================
 */
function mapApiPropertyToMapProperty(
  property: PropertySearchResult
): MapProperty | null {
  /**
   * برای نمایش Marker، مختصات عمومی الزامی است.
   */
  if (
    property.latitudePublic === null ||
    property.longitudePublic === null
  ) {
    return null;
  }

  return {
    id: property.id,

    title: getPropertyTypeLabel(
      property.propertyType
    ),

    location: [
      property.city,
      property.district,
    ]
      .filter(Boolean)
      .join("، "),

    area: property.area ?? 0,

    rooms: property.rooms ?? 0,

    price: formatPrice(property),

    mainImage: property.mainImage,

    latitude: property.latitudePublic,

    longitude: property.longitudePublic,

    transactionType:
      getTransactionLabel(
        property.transactionType
      ),

    propertyType:
      getPropertyTypeLabel(
        property.propertyType
      ),

    /**
     * فعلاً مقدار واقعی قیمت را نگه می‌داریم.
     *
     * این مقدار برای فیلتر قیمت استفاده می‌شود.
     */
    priceValue: property.salePrice
      ? Number(property.salePrice)
      : property.depositAmount
        ? Number(property.depositAmount)
        : undefined,
  };
}

/**
 * ============================================================
 * Props
 * ============================================================
 */
interface RealMapProps {
  /**
   * محدوده فعلی نقشه
   */
  bounds?: MapBounds | null;

  /**
   * فیلترهایی که کاربر اعمال کرده است.
   */
  appliedFilters?: PropertySearchState;

  /**
   * نتایج واقعی Backend
   */
  results?: PropertySearchResult[];

  /**
   * اطلاع دادن محدوده جدید نقشه
   */
  onBoundsChange?: (
    bounds: MapBounds
  ) => void;
}

/**
 * ============================================================
 * RealMap
 * ============================================================
 */
export function RealMap({
  bounds,
  appliedFilters,
  results = [],
  onBoundsChange,
}: RealMapProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  /**
   * ----------------------------------------------------------
   * تبدیل نتایج Backend به داده مورد نیاز نقشه
   * ----------------------------------------------------------
   */
  const properties = useMemo(
    () => results
      .map(mapApiPropertyToMapProperty)
      .filter((property): property is MapProperty => property !== null),
    [results]
  );

  /**
   * ----------------------------------------------------------
   * فیلتر کردن ملک‌ها
   * ----------------------------------------------------------
   *
   * Backend قبلاً فیلترهای اصلی را اعمال کرده است.
   *
   * اینجا فقط فیلترهای مربوط به نمایش فعلی نقشه
   * را کنترل می‌کنیم.
   */
  const filteredProperties =
    properties.filter((property) => {
      /**
       * محله
       */
      if (
        appliedFilters?.district?.trim() &&
        !property.location.includes(
          appliedFilters.district.trim()
        )
      ) {
        return false;
      }

      /**
       * نوع معامله
       */
      if (
        appliedFilters?.transactionType &&
        property.transactionType !==
          appliedFilters.transactionType
      ) {
        return false;
      }

      /**
       * نوع ملک
       */
      if (
        appliedFilters?.propertyType &&
        property.propertyType !==
          appliedFilters.propertyType
      ) {
        return false;
      }

      /**
       * حداقل متراژ
       */
      if (
        appliedFilters?.minArea &&
        property.area <
          Number(appliedFilters.minArea)
      ) {
        return false;
      }

      /**
       * حداکثر متراژ
       */
      if (
        appliedFilters?.maxArea &&
        property.area >
          Number(appliedFilters.maxArea)
      ) {
        return false;
      }

      /**
       * بازه تعداد اتاق؛ فیلتر اصلی نیز در Backend اعمال شده است.
       */
      if (
        appliedFilters?.minRooms &&
        property.rooms < Number(appliedFilters.minRooms)
      ) {
        return false;
      }

      if (
        appliedFilters?.maxRooms &&
        property.rooms > Number(appliedFilters.maxRooms)
      ) {
        return false;
      }

      /**
       * نکته:
       *
       * فیلتر قیمت در Backend انجام شده است.
       * بنابراین اینجا دوباره قیمت را فیلتر نمی‌کنیم.
       */

      return true;
    });

  /**
   * ----------------------------------------------------------
   * فیلتر محدوده نقشه
   * ----------------------------------------------------------
   */
  const visibleProperties = bounds
    ? filteredProperties.filter(
        (property) => {
          return (
            property.latitude >=
              bounds.south &&
            property.latitude <=
              bounds.north &&
            property.longitude >=
              bounds.west &&
            property.longitude <=
              bounds.east
          );
        }
      )
    : filteredProperties;

  const selectedProperty = visibleProperties.find(
    (property) => property.id === selectedPropertyId
  ) ?? null;

  return (
    <MapContainer
      center={SHAHRUD_CENTER}
      zoom={13}
      scrollWheelZoom={true}
      zoomControl={false}
      className="h-full w-full"
    >
      {/* نقشه OpenStreetMap */}
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* محدوده فعلی نقشه */}
      <MapViewport
        onBoundsChange={onBoundsChange}
      />

      {/* کنترل‌های نقشه */}
      <MapControls
        properties={visibleProperties}
      />

      {/* خوشه‌بندی بر اساس فاصله تصویری و بزرگ‌نمایی نقشه */}
      <MapClusterLayer
        properties={visibleProperties}
        selectedPropertyId={selectedPropertyId}
        onSelect={(property) => setSelectedPropertyId(property.id)}
      />

      {/* محدوده فقط برای آگهی انتخاب‌شده نمایش داده می‌شود */}
      {selectedProperty && (
        <MapPropertyMarker
          key={selectedProperty.id}
          property={selectedProperty}
          onSelect={(property) => setSelectedPropertyId(property.id)}
        />
      )}
    </MapContainer>
  );
}
