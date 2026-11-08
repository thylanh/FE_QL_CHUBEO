import { NextResponse } from "next/server";

import { getMonthKey, payrollRecords } from "@/lib/mockAttendancePayroll";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const month = getMonthKey(searchParams.get("month") ?? undefined);

  const items = payrollRecords.filter((record) => {
    const matchesEmployee = !employeeId || record.employeeId === employeeId;
    const matchesMonth = !month || record.periodStart.startsWith(month) || record.periodEnd.startsWith(month);
    return matchesEmployee && matchesMonth;
  });

  return NextResponse.json({
    success: true,
    data: items,
  });
}
