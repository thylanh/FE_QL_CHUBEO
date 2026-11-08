import { NextResponse } from "next/server";

import { attendanceRecords } from "@/lib/mockAttendancePayroll";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? undefined;

  const items = employeeId
    ? attendanceRecords.filter((record) => record.employeeId === employeeId)
    : attendanceRecords;

  return NextResponse.json({
    success: true,
    data: items,
  });
}
