import type { Metadata,Viewport } from "next";

import "./globals.css";

import { PwaRegistrar } from "@/lib/PwaRegistrar";
import { GlobalSessionControl } from "@/shared/components/GlobalSessionControl";

export const viewport: Viewport = {
  themeColor: "#062a5b",
};

/**
 * Metadata اصلی برنامه هشتی
 */
export const metadata: Metadata = {
  title: "هشتی",
  description: "پلتفرم هشتی",

  /**
   * مشخصات مربوط به ظاهر مرورگر/PWA
   */
  

  /**
   * لینک Manifest
   */
  manifest: "/manifest.webmanifest",
};

/**
 * Root Layout
 *
 * این Layout در تمام صفحات برنامه استفاده می‌شود.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {/* ==================================================
            ثبت Service Worker
            ==================================================
            این کامپوننت فقط در Production فعال می‌شود.
            در نتیجه Development تحت تأثیر Cache قرار نمی‌گیرد.
        ================================================== */}
        <PwaRegistrar />

        {/* کنترل مشترک ورود و خروج در تمام مسیرهای برنامه */}
        <GlobalSessionControl />

        {/* محتوای صفحات */}
        {children}
      </body>
    </html>
  );
}