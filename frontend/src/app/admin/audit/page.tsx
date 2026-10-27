import AdminAccessGuard from "@/features/admin/components/AdminAccessGuard";
import AdminAuditPage from "@/features/admin/components/AdminAuditPage";

export default function AdminAuditRoute() {
  return (
    <AdminAccessGuard>
      <AdminAuditPage />
    </AdminAccessGuard>
  );
}
