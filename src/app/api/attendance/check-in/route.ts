import { NextResponse } from "next/server";

import { attendanceRecords } from "@/lib/mockAttendancePayroll";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    employeeId?: string;
    checkIn?: string;
    note?: string;
  };

  const employeeId = body.employeeId?.trim();
  const checkInRaw = body.checkIn ?? new Date().toISOString();
  const note = body.note ?? "";

  if (!employeeId) {
    return NextResponse.json(
      { success: false, error: "Thiếu employeeId" },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const existing = attendanceRecords.find(
    (record) => record.employeeId === employeeId && record.workDate === today,
  );

  const checkIn = new Date(checkInRaw).toISOString();
  const checkInDate = new Date(checkIn);
  const status = checkInDate.getHours() > 8 || (checkInDate.getHours() === 8 && checkInDate.getMinutes() > 0) ? "LATE" : "PRESENT";

  const nextRecord = existing ?? {
    id: `att-${Date.now()}`,
    employeeId,
    workDate: today,
    status,
    note,
    createdAt: checkIn,
  };

  nextRecord.checkIn = checkIn;
  nextRecord.note = note || nextRecord.note || "";
  nextRecord.status = status;
  nextRecord.workDate = today;
  nextRecord.createdAt = nextRecord.createdAt ?? checkIn;

  if (nextRecord.checkOut) {
    const diffMs = new Date(nextRecord.checkOut).getTime() - new Date(nextRecord.checkIn).getTime();
    nextRecord.hoursWorked = Math.max(0, Math.round(diffMs / 60000));
  }

  if (!existing) {
    attendanceRecords.unshift(nextRecord as (typeof attendanceRecords)[number]);
  }

  return NextResponse.json({ success: true, data: nextRecord });
}
