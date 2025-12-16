import { AdminLayout } from "@/components/AdminLayout";
import Dashboard from "@/components/pages/Dashboard";

export default function HomePage() {
  return (
    <AdminLayout>
      <Dashboard />
    </AdminLayout>
  );
}