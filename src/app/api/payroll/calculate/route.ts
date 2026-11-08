import { NextResponse } from "next/server";

import type { EmployeePayroll } from "@/type/interface";
import { attendanceRecords, getMonthKey, payrollRecords } from "@/lib/mockAttendancePayroll";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    employeeId?: string;
    month?: string;
    baseSalary?: number;
    allowance?: number;
    deduction?: number;
    overtimeHours?: number;
    paid?: boolean;
  };

  const employeeId = body.employeeId?.trim();
  const month = getMonthKey(body.month ?? new Date().toISOString().slice(0, 7));

  if (!employeeId) {
    return NextResponse.json(
      { success: false, error: "Thiếu employeeId" },
      { status: 400 },
    );
  }

  const monthRecords = attendanceRecords.filter(
    (record) => record.employeeId === employeeId && record.workDate.startsWith(month),
  );

  const totalMinutes = monthRecords.reduce((sum, record) => sum + (record.hoursWorked ?? 0), 0);
  const baseSalary = Number(body.baseSalary ?? 0);
  const allowance = Number(body.allowance ?? 0);
  const deduction = Number(body.deduction ?? 0);
  const overtimeHours = Number(body.overtimeHours ?? 0);
  const hourlyRate = baseSalary > 0 ? baseSalary / 173 : 0;
  const totalSalary = Math.round(baseSalary + allowance + overtimeHours * hourlyRate * 1.5 + (totalMinutes / 60) * (hourlyRate * 0.2) - deduction);

  const item: EmployeePayroll = {
    id: `pay-${Date.now()}`,
    employeeId,
    periodStart: `${month}-01`,
    periodEnd: `${month}-30`,
    baseSalary,
    workingDays: monthRecords.length,
    attendanceDays: monthRecords.filter((record) => record.checkIn).length,
    overtimeHours,
    allowance,
    deduction,
    totalSalary,
    status: body.paid ? "PAID" : "DRAFT",
    paid: Boolean(body.paid),
    createdAt: new Date().toISOString(),
  };

  payrollRecords.unshift(item);

  return NextResponse.json({ success: true, data: item });
}
