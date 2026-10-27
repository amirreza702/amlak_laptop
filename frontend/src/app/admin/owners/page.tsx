import AdminAccessGuard from "@/features/admin/components/AdminAccessGuard";
import AdminOwnersPage from "@/features/admin/components/AdminOwnersPage";

export default function AdminOwnersRoute() {
  return (
    <AdminAccessGuard>
      <AdminOwnersPage />
    </AdminAccessGuard>
  );
}
