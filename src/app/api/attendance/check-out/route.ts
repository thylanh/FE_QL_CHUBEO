import { NextResponse } from "next/server";

import { attendanceRecords } from "@/lib/mockAttendancePayroll";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    employeeId?: string;
    checkOut?: string;
    note?: string;
  };

  const employeeId = body.employeeId?.trim();
  const checkOutRaw = body.checkOut ?? new Date().toISOString();

  if (!employeeId) {
    return NextResponse.json(
      { success: false, error: "Thiếu employeeId" },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const record = attendanceRecords.find(
    (item) => item.employeeId === employeeId && item.workDate === today,
  ) ?? {
    id: `att-${Date.now()}`,
    employeeId,
    workDate: today,
    status: "ABSENT",
    note: body.note ?? "",
    createdAt: new Date().toISOString(),
  };

  const checkOut = new Date(checkOutRaw).toISOString();
  record.checkOut = checkOut;
  record.note = body.note ?? record.note ?? "";
  record.workDate = today;

  if (record.checkIn) {
    const diffMs = new Date(checkOut).getTime() - new Date(record.checkIn).getTime();
    record.hoursWorked = Math.max(0, Math.round(diffMs / 60000));
  }

  if (record.status === "ABSENT" && record.checkIn) {
    record.status = "PRESENT";
  }

  if (!attendanceRecords.some((item) => item.id === record.id)) {
    attendanceRecords.unshift(record);
  }

  return NextResponse.json({ success: true, data: record });
}
