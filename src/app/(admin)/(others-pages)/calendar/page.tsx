import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Lịch làm việc & Đăng ký ca" />
      <Calendar />
    </div>
  );
}
