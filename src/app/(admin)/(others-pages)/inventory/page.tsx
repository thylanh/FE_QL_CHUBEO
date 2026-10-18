import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import InventoryTable from "@/components/inventory/InventoryTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danh sách nguyên liệu",
};

export default function InventoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Danh sách nguyên liệu" />
      <div className="space-y-6">
        <InventoryTable />
      </div>
    </div>
  );
}