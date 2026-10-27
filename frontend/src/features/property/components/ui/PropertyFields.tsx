import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import type {
  PropertyFormData,
  PropertyFormErrors,
} from "../../types/property";

import { PropertySection } from "./PropertySection";


interface PropertyFieldsProps {
  formData: PropertyFormData;

  errors: PropertyFormErrors;

  setField: (
    field: keyof PropertyFormData,
    value: string
  ) => void;
}


export function PropertyFields({
  formData,
  errors,
  setField,
}: PropertyFieldsProps) {

  return (
    <div className="space-y-8">

      {/* ==========================
          شناسه ملک
          ========================== */}

      <PropertySection
        title="شناسه ملک"
        description="کد پستی ملک را وارد کنید."
      >

        <div className="space-y-2">

          <Label htmlFor="postalCode">
            کد پستی
          </Label>

          <Input
            id="postalCode"
            name="postalCode"
            inputMode="numeric"
            value={formData.postalCode}
            onChange={(event) =>
              setField(
                "postalCode",
                event.target.value
              )
            }
            placeholder="مثلاً 361xxxxxxx"
            aria-invalid={
              !!errors.postalCode
            }
          />

          {errors.postalCode && (
            <p className="text-sm text-destructive">
              {errors.postalCode}
            </p>
          )}

        </div>

      </PropertySection>


      {/* ==========================
          مشخصات اصلی
          ========================== */}

      <PropertySection
        title="مشخصات اصلی"
        description="اطلاعات پایه ملک را وارد کنید."
      >

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          {/* متراژ */}

          <div className="space-y-2">

            <Label htmlFor="area">
              متراژ
            </Label>

            <Input
              id="area"
              name="area"
              type="number"
              inputMode="numeric"
              min="1"
              value={formData.area}
              onChange={(event) =>
                setField(
                  "area",
                  event.target.value
                )
              }
              placeholder="مثلاً 120"
              aria-invalid={
                !!errors.area
              }
            />

            {errors.area && (
              <p className="text-sm text-destructive">
                {errors.area}
              </p>
            )}

          </div>


          {/* تعداد اتاق */}

          <div className="space-y-2">

            <Label htmlFor="rooms">
              تعداد اتاق
            </Label>

            <Input
              id="rooms"
              name="rooms"
              type="number"
              inputMode="numeric"
              min="0"
              value={formData.rooms}
              onChange={(event) =>
                setField(
                  "rooms",
                  event.target.value
                )
              }
              placeholder="مثلاً 3"
              aria-invalid={
                !!errors.rooms
              }
            />

            {errors.rooms && (
              <p className="text-sm text-destructive">
                {errors.rooms}
              </p>
            )}

          </div>


          {/* طبقه */}

          <div className="space-y-2">

            <Label htmlFor="floor">
              طبقه
            </Label>

            <Input
              id="floor"
              name="floor"
              type="number"
              inputMode="numeric"
              value={formData.floor}
              onChange={(event) =>
                setField(
                  "floor",
                  event.target.value
                )
              }
              placeholder="مثلاً 2"
              aria-invalid={
                !!errors.floor
              }
            />

            {errors.floor && (
              <p className="text-sm text-destructive">
                {errors.floor}
              </p>
            )}

          </div>

        </div>

      </PropertySection>

    </div>
  );
}