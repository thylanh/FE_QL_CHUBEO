import type { EmployeeAttendance, EmployeePayroll } from "@/type/interface";

export const attendanceRecords: EmployeeAttendance[] = [
  {
    id: "att-001",
    employeeId: "emp-001",
    workDate: "2026-11-01",
    checkIn: "2026-11-01T08:15:00+07:00",
    checkOut: "2026-11-01T17:15:00+07:00",
    status: "PRESENT",
    note: "Đi làm đúng giờ",
    hoursWorked: 540,
    createdAt: "2026-11-01T08:15:00+07:00",
  },
  {
    id: "att-002",
    employeeId: "emp-001",
    workDate: "2026-11-02",
    checkIn: "2026-11-02T08:45:00+07:00",
    checkOut: "2026-11-02T17:45:00+07:00",
    status: "LATE",
    note: "Đi trễ 45 phút",
    hoursWorked: 540,
    createdAt: "2026-11-02T08:45:00+07:00",
  },
  {
    id: "att-003",
    employeeId: "emp-002",
    workDate: "2026-11-01",
    checkIn: "2026-11-01T07:55:00+07:00",
    checkOut: "2026-11-01T16:55:00+07:00",
    status: "PRESENT",
    note: "",
    hoursWorked: 540,
    createdAt: "2026-11-01T07:55:00+07:00",
  },
];

export const payrollRecords: EmployeePayroll[] = [
  {
    id: "pay-001",
    employeeId: "emp-001",
    employee: { id: "emp-001", fullName: "Nguyễn Văn A", code: "NV001" },
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    baseSalary: 12000000,
    workingDays: 22,
    attendanceDays: 20,
    overtimeHours: 4,
    allowance: 500000,
    deduction: 200000,
    totalSalary: 12450000,
    status: "DRAFT",
    paid: false,
    createdAt: "2026-11-05T00:00:00+07:00",
  },
  {
    id: "pay-002",
    employeeId: "emp-002",
    employee: { id: "emp-002", fullName: "Trần Thị B", code: "NV002" },
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    baseSalary: 9500000,
    workingDays: 22,
    attendanceDays: 18,
    overtimeHours: 2,
    allowance: 300000,
    deduction: 100000,
    totalSalary: 9890000,
    status: "PAID",
    paid: true,
    createdAt: "2026-11-05T00:00:00+07:00",
  },
];

export function getMonthKey(month?: string) {
  if (!month) return new Date().toISOString().slice(0, 7);
  return month.length >= 7 ? month.slice(0, 7) : month;
}
