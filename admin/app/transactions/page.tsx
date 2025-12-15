import { AdminLayout } from "@/components/AdminLayout";
import TransactionManagement from "@/components/pages/TransactionManagement";

export default function TransactionsPage() {
  return (
    <AdminLayout>
      <TransactionManagement />
    </AdminLayout>
  );
}