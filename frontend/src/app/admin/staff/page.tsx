import AdminAccessGuard from "@/features/admin/components/AdminAccessGuard";
import AdminStaffPage from "@/features/admin/components/AdminStaffPage";

export default function AdminStaffRoute() {
  return (
    <AdminAccessGuard>
      <AdminStaffPage />
    </AdminAccessGuard>
  );
}
