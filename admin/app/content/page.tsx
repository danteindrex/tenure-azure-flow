import { AdminLayout } from "@/components/AdminLayout";
import NewsfeedManagement from "@/components/pages/NewsfeedManagement";

export default function ContentPage() {
  return (
    <AdminLayout>
      <NewsfeedManagement />
    </AdminLayout>
  );
}