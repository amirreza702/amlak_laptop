"use client";

import { useState, type FormEvent } from "react";
import { createPropertyListing, createPropertyRecord } from "../api/propertyApi";
import type { Coordinates, PropertyType, TransactionType } from "../types/propertyRegistration";
import { validatePropertyRegistration } from "../utils/validatePropertyRegistration";

/**
 * تمام state، اعتبارسنجی و ارسال فرم ثبت ملک در این Hook نگهداری می‌شود.
 * کامپوننت ثبت ملک فقط فرم را نمایش می‌دهد و رویداد submit را واگذار می‌کند.
 */
export function usePropertyRegistration(onSavePrivateNote?: (propertyId: string, note: string) => Promise<void>) {
  const [propertyType, setPropertyType] = useState<PropertyType>("APARTMENT");
  const [transactionType, setTransactionType] = useState<TransactionType>("SALE");
  const [city, setCity] = useState("شاهرود");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [area, setArea] = useState("");
  const [rooms, setRooms] = useState("");
  const [floor, setFloor] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  // توضیح خصوصی مشاور اختیاری است و جدا از توضیحات عمومی آگهی ذخیره می‌شود.
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [listingCreated, setListingCreated] = useState(false);

  async function submitListing(propertyId: string) {
    // اگر ذخیره یادداشت شکست بخورد، ثبت معامله انجام نمی‌شود و کاربر می‌تواند دوباره تلاش کند.
    if (onSavePrivateNote && internalNote.trim()) {
      await onSavePrivateNote(propertyId, internalNote.trim());
    }
    await createPropertyListing(propertyId, {
      transactionType,
      salePrice: transactionType === "SALE" ? salePrice.trim() : null,
      depositAmount: transactionType === "FULL_DEPOSIT" ? depositAmount.trim() : null,
      rentAmount: transactionType === "RENT" ? rentAmount.trim() : null,
    });
    setListingCreated(true);
    setMessage("اطلاعات ملک و معامله با موفقیت ثبت شد. آگهی هنوز منتشر نشده و برای انتشار باید مراحل بررسی و تأیید هشتی طی شود.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      // اگر خود ملک قبلاً ثبت شده و فقط ثبت Listing ناموفق بوده، ملک را دوباره ایجاد نکن.
      if (createdPropertyId && !listingCreated) {
        await submitListing(createdPropertyId);
        return;
      }

      const validationError = validatePropertyRegistration({
        coordinates,
        transactionType,
        salePrice,
        depositAmount,
        rentAmount,
      });
      if (validationError) {
        throw new Error(validationError);
      }

      // اعتبارسنجی بالا برای نمایش خطا است؛ این guard همچنین null نبودن مختصات را برای TypeScript تضمین می‌کند.
      const selectedCoordinates = coordinates;
      if (!selectedCoordinates) {
        throw new Error("لطفاً موقعیت ملک را روی نقشه انتخاب کنید.");
      }

      const body = await createPropertyRecord({
        propertyType,
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
        postalCode: postalCode.trim() || null,
        latitudeExact: selectedCoordinates.latitude,
        longitudeExact: selectedCoordinates.longitude,
        area: area.trim() ? Number(area) : null,
        rooms: rooms.trim() ? Number(rooms) : null,
        floor: floor.trim() ? Number(floor) : null,
      });

      const propertyId = body.property?.id;
      if (!propertyId) {
        throw new Error("پاسخ سرور شناسه ملک را برنگرداند؛ پیش از ثبت مجدد، فهرست املاک را بررسی کنید.");
      }

      setCreatedPropertyId(propertyId);
      await submitListing(propertyId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت اطلاعات ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }


  return {
    propertyType, setPropertyType,
    transactionType, setTransactionType,
    city, setCity, district, setDistrict, address, setAddress,
    postalCode, setPostalCode, coordinates, setCoordinates,
    area, setArea, rooms, setRooms, floor, setFloor,
    salePrice, setSalePrice, depositAmount, setDepositAmount,
    rentAmount, setRentAmount, internalNote, setInternalNote,
    busy, error, message, createdPropertyId, listingCreated,
    submit,
  };
}
