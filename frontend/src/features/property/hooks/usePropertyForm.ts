import { useState } from "react";

import type {
  PropertyFormData,
  PropertyFormErrors,
} from "../types/property";

import { validateProperty } from "../utils/validateProperty";

import { createProperty } from "../api/propertyApi";

const initialState: PropertyFormData = {
  postalCode: "",
  area: "",
  rooms: "",
  floor: "",
};

export function usePropertyForm(agentId: string) {
  const [formData, setFormData] =
    useState<PropertyFormData>(initialState);

  const [errors, setErrors] =
    useState<PropertyFormErrors>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  // خطای برگشتی از Backend
  const [submitError, setSubmitError] =
    useState<string | null>(null);

  function setField(
    field: keyof PropertyFormData,
    value: string
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    // با تغییر فیلد، خطای همان فیلد پاک می‌شود
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    // خطای Backend هم با تغییر اطلاعات پاک می‌شود
    setSubmitError(null);
  }

  function validate(): boolean {
    const validationErrors =
      validateProperty(formData);

    setErrors(validationErrors);

    return (
      Object.keys(validationErrors).length === 0
    );
  }

  async function submit() {
    // خطای قبلی Backend را پاک می‌کنیم
    setSubmitError(null);

    // ابتدا Validation سمت Frontend
    if (!validate()) {
      return false;
    }

    try {
      setIsSubmitting(true);

      // ارسال اطلاعات به Backend
      await createProperty(formData, agentId);

      // اگر موفق بود، فرم پاک شود
      reset();

      return true;
    } catch (error) {
      // دریافت خطای Backend
      setSubmitError(
        error instanceof Error
          ? error.message
          : "خطا در ثبت ملک"
      );

      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setFormData(initialState);
    setErrors({});
    setSubmitError(null);
  }

  return {
    formData,
    errors,
    isSubmitting,
    submitError,
    setField,
    submit,
    reset,
  };
}