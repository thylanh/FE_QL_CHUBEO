import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Sự kiện & Ca làm việc" />
      <Calendar />
    </div>
  );
}
