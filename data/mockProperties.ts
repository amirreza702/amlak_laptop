export type Property = {
  id: string;
  title: string;
  location: string;
  priceRange: string;
  type: string;
  imageUrl: string;
  isFeatured?: boolean;
};

export const mockProperties: Property[] = [
  {
    id: 'SH-1001',
    title: 'آپارتمان نوساز با ویوی کوهستان',
    location: 'شاهرود، بلوار اصلی',
    priceRange: '۴ تا ۵ میلیارد تومان',
    type: 'آپارتمان',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=500', // عکس فرضی
    isFeatured: true,
  },
  {
    id: 'SH-1002',
    title: 'زمین کشاورزی با دسترسی عالی',
    location: 'حاشیه شاهرود',
    priceRange: '۸۰۰ میلیون تا ۱.۲ میلیارد',
    type: 'زمین',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=500',
    isFeatured: false,
  },
  {
    id: 'SH-1003',
    title: 'ویلای مدرن با استخر اختصاصی',
    location: 'شاهرود، جاده جنگلی',
    priceRange: '۱۲ تا ۱۵ میلیارد تومان',
    type: 'ویلا',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=500',
    isFeatured: true,
  },
];
