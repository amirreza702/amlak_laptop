
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

import {
  MapContainer,
  TileLayer,
} from "react-leaflet";

import type {
  PropertySearchResult,
  PropertySearchState,
} from "@/features/search/hooks/usePropertySearch";

import { MapPropertyMarker } from "../MapPropertyMarker";

import { MapControls } from "./MapControls";

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
      return "خرید";

    case "FULL_DEPOSIT":
      return "رهن";

    case "RENT":
      return "اجاره";

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

  if (property.transactionType === "RENT") {
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
  /**
   * ----------------------------------------------------------
   * تبدیل نتایج Backend به داده مورد نیاز نقشه
   * ----------------------------------------------------------
   */
  const properties = results
    .map(mapApiPropertyToMapProperty)
    .filter(
      (
        property
      ): property is MapProperty =>
        property !== null
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
       * تعداد اتاق
       */
      if (appliedFilters?.rooms) {
        const roomsFilter =
          appliedFilters.rooms;

        if (roomsFilter.endsWith("+")) {
          const minimumRooms = Number(
            roomsFilter.replace("+", "")
          );

          if (
            property.rooms <
            minimumRooms
          ) {
            return false;
          }
        } else {
          if (
            property.rooms !==
            Number(roomsFilter)
          ) {
            return false;
          }
        }
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

      {/* ======================================================
          Markerهای ملک‌های واقعی Backend
          ====================================================== */}
      {visibleProperties.map((property) => (
        <MapPropertyMarker
          key={property.id}
          property={property}
        />
      ))}
    </MapContainer>
  );
}
