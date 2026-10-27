interface PropertyFormLayoutProps {
  children: React.ReactNode;
}

export function PropertyFormLayout({
  children,
}: PropertyFormLayoutProps) {
  return (
    <div className="space-y-8">
      {children}
    </div>
  );
}