/**
 * اطلاعاتی که کاربر در فرم ثبت ملک وارد می‌کند.
 *
 * این Type مربوط به UI/Form است
 * و مدل Database نیست.
 */
export interface PropertyFormData {
  postalCode: string;
  area: string;
  rooms: string;
  floor: string;
}


/**
 * خطاهای Validation فرم
 */
export interface PropertyFormErrors {
  postalCode?: string;
  area?: string;
  rooms?: string;
  floor?: string;
}