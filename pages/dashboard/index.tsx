import Head from "next/head";
import DashboardLayout from "../../src/components/DashboardLayout";
import DashboardSimple from "../../src/pages/DashboardSimple";

export default function DashboardIndex() {
  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | Tenure</title>
        <meta name="description" content="Overview of your Tenure account." />
      </Head>
      <DashboardSimple />
    </DashboardLayout>
  );
}