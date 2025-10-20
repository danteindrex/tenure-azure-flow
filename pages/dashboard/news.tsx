import DashboardLayout from "@/components/DashboardLayout";
import NewsFeed from "../../src/pages/dashboard/NewsFeed";

const NewsPage = () => {
  return (
    <DashboardLayout>
      <NewsFeed />
    </DashboardLayout>
  );
};

export default NewsPage;