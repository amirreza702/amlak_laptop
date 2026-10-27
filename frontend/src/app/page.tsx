"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HomeHeader } from "@/shared/components/HomeHeader";
import { HomeSearchButton } from "@/shared/components/HomeSearchButton";
import { HomeRequestButton } from "@/shared/components/HomeRequestButton";
import { HomeRoleCards } from "@/shared/components/HomeRoleCards";
import { HomeTrustMessage } from "@/shared/components/HomeTrustMessage";

import dynamic from "next/dynamic";

/**
 * نقشه فقط در مرورگر لود می‌شود.
 *
 * دلیل:
 * Leaflet به window و document نیاز دارد
 * و نباید هنگام prerender سمت سرور اجرا شود.
 */
const RealMap = dynamic(
  () =>
    import("@/shared/components/map/RealMap").then(
      (module) => module.RealMap
    ),
  {
    ssr: false,
  }
);

const HOME_LOADING_DURATION_MS = 800;

export default function Page() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setIsLoading(false),
      HOME_LOADING_DURATION_MS
    );

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        w-full
        overflow-visible
        bg-slate-100
      "
    >
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          aria-label="در حال بارگذاری هشتی"
          className="
            fixed
            inset-0
            z-[3000]
            flex
            flex-col
            items-center
            justify-center
            gap-5
            bg-white
            transition-opacity
          "
        >
          <div className="relative flex h-48 w-48 items-center justify-center rounded-[2rem] bg-white p-3 shadow-xl ring-1 ring-slate-100">
            <Image
              src="/hashti-logo.png"
              alt="لوگوی هشتی"
              width={600}
              height={600}
              priority
              className="h-full w-full object-contain"
            />
          </div>

          

          
        </div>
      )}

      {/* ======================================================
          نقشه پس‌زمینه Home
          ====================================================== */}
      <div
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          select-none
        "
      >
        <div
          className="
            absolute
            inset-0
            grayscale
            opacity-40
          "
        >
          <RealMap />
        </div>

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-white/45
          "
        />
      </div>

      {/* محتوای اصلی Home */}
      <div
        className="
          relative
          z-10
          flex
          min-h-screen
          w-full
          flex-col
          overflow-visible
        "
      >
        <HomeHeader />

        <main
          className="
            flex
            w-full
            flex-1
            items-start
            justify-center
            px-4
            py-6
            sm:px-6
            sm:py-10
            lg:px-8
            lg:py-12
          "
        >
          <div
            className="
              w-full
              max-w-2xl
              sm:max-w-3xl
              lg:max-w-5xl
            "
          >
            <div
              className="
                mb-6
                text-center
                sm:mb-7
              "
            >
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500
                  sm:text-base
                "
              >
                ساده‌تر پیدا کنید، مطمئن‌تر معامله کنید
              </p>

              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  tracking-tight
                  text-slate-900
                  sm:text-3xl
                  lg:text-4xl
                "
              >
                ملک مناسب خود را پیدا کنید
              </h2>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-slate-200/90
                bg-white/95
                p-4
                shadow-[0_18px_50px_rgba(15,23,42,0.12)]
                backdrop-blur-md
                sm:p-6
                lg:p-7
              "
            >
              <div className="space-y-3 sm:space-y-4">
                <HomeSearchButton />
                <HomeRequestButton />

                <HomeRoleCards
                  onAgentClick={() => router.push("/agent")}
                  onOwnerClick={() => router.push("/owner")}
                />
              </div>
            </div>

            <div className="mt-4 pb-12">
              <HomeTrustMessage />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
