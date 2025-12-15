import { AdminLayout } from "@/components/AdminLayout";
import UserManagement from "@/components/pages/UserManagement";

export default function UsersPage() {
  return (
    <AdminLayout>
      <UserManagement />
    </AdminLayout>
  );
}