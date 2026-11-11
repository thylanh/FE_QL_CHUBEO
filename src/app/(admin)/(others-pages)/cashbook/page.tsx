import CashbookManagement from "@/components/cashbook/CashbookManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sổ thu chi",
};

export default function CashbookPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Sổ thu chi" />
      <CashbookManagement />
    </div>
  );
}
