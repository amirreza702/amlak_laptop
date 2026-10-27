/*
  Hashti PWA Service Worker

  Strategy:
  - صفحات HTML: Network First
  - فایل‌های استاتیک، آیکون‌ها و تصاویر: Cache First
*/

const CACHE_NAME = "hashti-static-v1";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/hashti-browser-icon.png",
];

/* نصب: ذخیرهٔ فایل‌های پایهٔ قابل Cache */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

/* فعال‌سازی: حذف Cacheهای نسخه‌های قدیمی */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/*
  درخواست‌های صفحه:
  ابتدا آخرین محتوای آنلاین را می‌گیریم؛
  اگر اینترنت نبود، نسخهٔ Cache‌شده را نمایش می‌دهیم.
*/
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /* درخواست‌های API بک‌اند نباید توسط Service Worker Cache شوند. */
  if (url.pathname.startsWith("/api")) {
    return;
  }

  /* فقط دارایی‌های متعلق به همین سایت مدیریت می‌شوند. */
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseCopy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });

          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);

          return (
            cachedPage ||
            caches.match("/") ||
            new Response("اتصال اینترنت در دسترس نیست.", {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
              },
            })
          );
        }),
    );

    return;
  }

  /*
    فایل‌های استاتیک:
    اول از Cache خوانده می‌شوند؛
    اگر نبودند، از شبکه گرفته و برای دفعات بعد ذخیره می‌شوند.
  */
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        const responseCopy = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseCopy);
        });

        return response;
      });
    }),
  );
});
