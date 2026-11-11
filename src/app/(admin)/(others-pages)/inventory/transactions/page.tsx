import InventoryTransactions from "@/components/inventory/InventoryTransactions";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xuất nhập tồn kho",
};

export default function InventoryTransactionsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Xuất nhập tồn kho" />
      <InventoryTransactions />
    </div>
  );
}
