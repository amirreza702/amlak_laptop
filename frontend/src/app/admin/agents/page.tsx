import AdminAccessGuard from "@/features/admin/components/AdminAccessGuard";
import AdminAgentsPage from "@/features/admin/components/AdminAgentsPage";

export default function AdminAgentsRoute() {
  return (
    <AdminAccessGuard>
      <AdminAgentsPage />
    </AdminAccessGuard>
  );
}
