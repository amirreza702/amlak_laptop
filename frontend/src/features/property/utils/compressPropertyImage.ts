/**
 * بهینه‌سازی تصویر ملک در مرورگر، پیش از ارسال به سرور.
 * خروجی WebP با حفظ نسبت تصویر و حداکثر ضلع ۱۶۰۰ پیکسل است.
 * کیفیت/ابعاد به‌صورت تدریجی تنظیم می‌شوند تا حجم خروجی معمولاً نزدیک ۸۰۰KB شود.
 */
export async function compressPropertyImage(file: File): Promise<string> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("فقط تصویر با فرمت‌های JPG، PNG، WebP یا AVIF مجاز است.");
  }
  if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
    throw new Error("حجم تصویر اولیه باید بیشتر از صفر و حداکثر ۲۰ مگابایت باشد.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("خواندن تصویر ممکن نیست؛ لطفاً تصویر را با فرمت JPG یا PNG انتخاب کنید.");
  }

  try {
    const canvas = document.createElement("canvas");
    const variants = [
      { maxSide: 1600, quality: 0.82 },
      { maxSide: 1600, quality: 0.76 },
      { maxSide: 1600, quality: 0.70 },
      { maxSide: 1440, quality: 0.72 },
      { maxSide: 1280, quality: 0.70 },
    ] as const;
    const targetBytes = 800 * 1024;
    const maxOutputBytes = 4 * 1024 * 1024;
    let bestBlob: Blob | null = null;

    for (const variant of variants) {
      const scale = Math.min(1, variant.maxSide / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("امکان پردازش تصویر در این مرورگر وجود ندارد.");
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => value
            ? resolve(value)
            : reject(new Error("بهینه‌سازی تصویر ناموفق بود.")),
          "image/webp",
          variant.quality
        );
      });

      // بعضی مرورگرها در نبود پشتیبانی WebP ممکن است PNG برگردانند.
      if (blob.type !== "image/webp") {
        throw new Error("مرورگر شما خروجی WebP را پشتیبانی نمی‌کند؛ لطفاً از مرورگر به‌روز استفاده کنید.");
      }

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }
      if (blob.size <= targetBytes) {
        bestBlob = blob;
        break;
      }
    }

    if (!bestBlob || bestBlob.size <= 0 || bestBlob.size > maxOutputBytes) {
      throw new Error("حجم تصویر پس از بهینه‌سازی هنوز بیش از ۴ مگابایت است.");
    }
    const outputBlob = bestBlob;

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("خواندن تصویر ناموفق بود."));
      reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود."));
      reader.readAsDataURL(outputBlob);
    });
  } finally {
    bitmap.close();
  }
}
