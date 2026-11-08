import EmployeeAccountForm from "@/components/employee/EmployeeAccountForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tạo tài khoản nhân viên",
};

export default function EmployeeAccountPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Tạo tài khoản nhân viên" />
      <EmployeeAccountForm />
    </div>
  );
}
