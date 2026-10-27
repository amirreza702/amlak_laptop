"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

import { usePropertyForm } from "../hooks/usePropertyForm";

import { PropertyFields } from "./ui/PropertyFields";
import { PropertySubmitButton } from "./ui/PropertySubmitButton";
import { PropertyFormLayout } from "./layout/PropertyFormLayout";

interface PropertyFormProps {
  agentId: string;
}

export function PropertyForm({
  agentId,
}: PropertyFormProps) {
  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    setField,
    submit,
  } = usePropertyForm(agentId);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await submit();
  }

  return (
    <PropertyFormLayout>

      {/* Brand */}
      <div className="mb-8 flex items-center gap-4">

        <div
          className="
            flex
            h-16
            w-16
            shrink-0
            items-center
            justify-center
            rounded-2xl
            bg-white
            p-2
            shadow-sm
            ring-1
            ring-black/5
          "
        >
          <img
            src="/brand/hashti-logo.jpg"
            alt="لوگوی هشتی"
            className="h-full w-full object-contain"
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            هشتی
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            سامانه هوشمند املاک
          </p>
        </div>

      </div>

      {/* Page title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          ثبت ملک
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          اطلاعات ملک را با دقت وارد کنید تا آگهی شما در هشتی
          ثبت شود.
        </p>
      </div>

      <Card
        className="
          border-0
          bg-white
          shadow-lg
          shadow-slate-200/60
          transition-shadow
          duration-300
          hover:shadow-xl
        "
      >

        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-lg">
            اطلاعات ملک
          </CardTitle>

          <p className="text-sm text-slate-500">
            مشخصات اصلی ملک را وارد کنید.
          </p>
        </CardHeader>

        <CardContent className="pt-6">

          <form
            onSubmit={handleSubmit}
            className="space-y-8"
          >

            <PropertyFields
              formData={formData}
              errors={errors}
              setField={setField}
            />

            {submitError && (
              <div
                role="alert"
                className="
                  rounded-xl
                  border
                  border-destructive/30
                  bg-destructive/5
                  p-4
                  text-sm
                  text-destructive
                "
              >
                {submitError}
              </div>
            )}

            <div
              className="
                flex
                flex-col
                gap-3
                border-t
                border-slate-100
                pt-6
                sm:flex-row
                sm:items-center
                sm:justify-end
              "
            >
              <PropertySubmitButton
                isSubmitting={isSubmitting}
              />
            </div>

          </form>

        </CardContent>

      </Card>

    </PropertyFormLayout>
  );
}