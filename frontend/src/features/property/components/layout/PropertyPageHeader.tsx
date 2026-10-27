import Image from "next/image";

interface PropertyPageHeaderProps {
  title: string;
  description?: string;
}

export function PropertyPageHeader({
  title,
  description,
}: PropertyPageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl shadow-lg">

      <div className="relative h-64 sm:h-72 lg:h-80">

        <Image
          src="/property-hero.jpg"
          alt="ملک در سامانه هشتی"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-[#0b3158]/65" />

        <div className="absolute inset-0 flex items-end">

          <div className="w-full p-6 sm:p-8 lg:p-10">

            <div className="max-w-2xl">

              <div className="mb-4 inline-flex items-center rounded-full bg-[#159ca8]/90 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                سامانه هوشمند املاک هشتی
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {title}
              </h1>

              {description && (
                <p className="mt-3 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
                  {description}
                </p>
              )}

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}