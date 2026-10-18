import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BasicTableOne from "@/components/menu/MenuTableOne";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danh sách món",
};

export default function BasicTables() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Quản lý Menu" />
      <div className="space-y-6">
          <BasicTableOne />
      </div>
    </div>
  );
}
