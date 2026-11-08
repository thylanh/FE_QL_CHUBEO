import EmployeeManagement from "@/components/employee/EmployeeManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danh sách nhân viên",
};

export default function EmployeePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Danh sách nhân viên" />
      <EmployeeManagement />
    </div>
  );
}
