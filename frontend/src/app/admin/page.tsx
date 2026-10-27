import AdminAccessGuard from "@/features/admin/components/AdminAccessGuard";
import AdminHomePage from "@/features/admin/components/AdminHomePage";

export default function AdminHomeRoute() {
  return (
    <AdminAccessGuard>
      <AdminHomePage />
    </AdminAccessGuard>
  );
}
