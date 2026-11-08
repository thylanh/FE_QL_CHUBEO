import EmployeeRegistrationForm from "@/components/employee/EmployeeRegistrationForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký nhân viên",
};

export default function EmployeeRegisterPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Đăng ký nhân viên" />
      <EmployeeRegistrationForm />
    </div>
  );
}
