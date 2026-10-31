/**
 * بهینه‌سازی تصویر در مرورگر پیش از ارسال به سرور.
 * خروجی WebP با حداکثر ضلع ۱۶۰۰ پیکسل و کیفیت ۸۲٪ است.
 */
export async function compressPropertyImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("فقط فایل تصویری انتخاب کنید.");
  if (file.size > 20 * 1024 * 1024) throw new Error("حجم تصویر اولیه نباید بیشتر از ۲۰ مگابایت باشد.");

  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("امکان پردازش تصویر در این مرورگر وجود ندارد.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("بهینه‌سازی تصویر ناموفق بود.")), "image/webp", 0.82);
    });
    if (blob.size > 4 * 1024 * 1024) throw new Error("حجم تصویر پس از بهینه‌سازی هنوز بیش از ۴ مگابایت است.");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("خواندن تصویر ناموفق بود."));
      reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود."));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}
