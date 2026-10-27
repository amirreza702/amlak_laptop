import AdminAccessGuard from "@/features/admin/components/AdminAccessGuard";
import AdminUsersPage from "@/features/admin/components/AdminUsersPage";

export default function AdminUsersRoute() {
  return (
    <AdminAccessGuard>
      <AdminUsersPage />
    </AdminAccessGuard>
  );
}
