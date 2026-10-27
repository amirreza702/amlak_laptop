interface PropertySectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}


export function PropertySection({
  title,
  description,
  children,
}: PropertySectionProps) {

  return (
    <section className="space-y-5">

      <div className="space-y-1">

        <h2 className="text-lg font-semibold tracking-tight">
          {title}
        </h2>

        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

      </div>

      {children}

    </section>
  );
}