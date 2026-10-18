import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import OrderCreation from "@/components/order/OrderCreation";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = { title: "Tạo đơn hàng" };

export default function FormElements() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Tạo đơn hàng" />
      <OrderCreation />
    </div>
  );
}
