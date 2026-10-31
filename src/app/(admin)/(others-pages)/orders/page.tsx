import OrderManagement from "@/components/order/OrderManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý đơn hàng",
};

export default function OrdersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Quản lý đơn hàng" />
      <OrderManagement />
    </div>
  );
}
