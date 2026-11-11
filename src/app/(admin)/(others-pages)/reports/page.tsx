import MonthlyReport from "@/components/reports/MonthlyReport";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Báo cáo & thống kê",
};

export default function ReportsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Báo cáo & thống kê" />
      <MonthlyReport />
    </div>
  );
}
