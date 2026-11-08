"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiConfig";
import type { AttendanceStatus, Employee, EmployeeAttendance, EmployeePayroll, EmployeeStatus } from "@/type/interface";

const statusClasses: Record<EmployeeStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  INACTIVE: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  RESIGNED: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
};

const statusLabels: Record<EmployeeStatus, string> = {
  ACTIVE: "Đang làm",
  INACTIVE: "Tạm nghỉ",
  RESIGNED: "Đã nghỉ",
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Có mặt",
  LATE: "Đi muộn",
  ABSENT: "Vắng mặt",
  LEAVE: "Nghỉ phép",
  OFF: "Nghỉ",
  HOLIDAY: "Ngày lễ",
};

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0đ";
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function formatDayMonth(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value.toString();
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTimeWithDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return (
    <div className="flex flex-col items-start">
      <span>{date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
      <span className="text-[10px] text-gray-500 dark:text-gray-400">{formatDayMonth(date)}</span>
    </div>
  );
}

function getInitials(name?: string | null) {
  if (!name) return "NV";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | EmployeeStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<EmployeeAttendance[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<EmployeePayroll[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const loadAttendanceData = async () => {
    const response = await apiClient.attendance.getAttendance();
    if (response.success && response.data) {
      const list = Array.isArray(response.data) ? response.data : [response.data];
      setAttendanceRecords(list as EmployeeAttendance[]);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      const [employeeResponse, attendanceResponse, payrollResponse] = await Promise.all([
        apiClient.employees.getEmployees(),
        apiClient.attendance.getAttendance(),
        apiClient.payroll.getPayrolls(undefined, new Date().toISOString().slice(0, 7)),
      ]);

      if (employeeResponse.success && employeeResponse.data) {
        const list = Array.isArray(employeeResponse.data) ? employeeResponse.data : [employeeResponse.data];
        setEmployees(list as Employee[]);
      } else {
        setError(employeeResponse.error || "Không thể tải danh sách nhân viên.");
      }

      if (attendanceResponse.success && attendanceResponse.data) {
        const list = Array.isArray(attendanceResponse.data) ? attendanceResponse.data : [attendanceResponse.data];
        setAttendanceRecords(list as EmployeeAttendance[]);
      }

      if (payrollResponse.success && payrollResponse.data) {
        const list = Array.isArray(payrollResponse.data) ? payrollResponse.data : [payrollResponse.data];
        setPayrollRecords(list as EmployeePayroll[]);
      }

      setLoading(false);
    };

    void fetchAll();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        employee.fullName?.toLowerCase().includes(term) ||
        employee.code?.toLowerCase().includes(term) ||
        employee.phone?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term);
      const matchesStatus = selectedStatus === "ALL" || employee.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [employees, search, selectedStatus]);

  const totalActive = employees.filter((employee) => employee.status === "ACTIVE").length;
  const totalInactive = employees.filter((employee) => employee.status === "INACTIVE").length;
  const totalResigned = employees.filter((employee) => employee.status === "RESIGNED").length;
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const selectedAttendance = attendanceRecords.filter((record) => record.employeeId === selectedEmployeeId);
  const selectedPayroll = payrollRecords.filter((record) => record.employeeId === selectedEmployeeId);

  const handleQuickAttendance = async (employee: Employee) => {
    const response = await apiClient.attendance.checkIn({
      employeeId: employee.id,
      checkIn: new Date().toISOString(),
      note: "Chấm công từ dashboard",
    });

    if (response.success) {
      const today = new Date().toISOString().slice(0, 10);
      const payload = response.data as EmployeeAttendance | undefined;
      const localStamp = new Date().toISOString().replace(/[-:T.]/g, "");
      const incoming = payload ?? {
        id: `local-${employee.id}-${today}-${localStamp}`,
        employeeId: employee.id,
        workDate: today,
        checkIn: new Date().toISOString(),
        checkOut: null,
        status: "PRESENT",
        note: "Chấm công từ dashboard",
      };

      setAttendanceRecords((current) => {
        const existingIndex = current.findIndex((record) => record.employeeId === employee.id && record.workDate === today);
        const nextRecord: EmployeeAttendance = {
          ...incoming,
          employeeId: employee.id,
          workDate: today,
          checkIn: incoming.checkIn ?? new Date().toISOString(),
          status: incoming.status ?? "PRESENT",
          note: incoming.note ?? "Chấm công từ dashboard",
        };

        if (existingIndex >= 0) {
          const cloned = [...current];
          cloned[existingIndex] = nextRecord;
          return cloned;
        }

        return [nextRecord, ...current];
      });

      setError(null);
      alert("Đã ghi nhận chấm công thành công.");
      await loadAttendanceData();
    } else {
      setError(response.error || "Không thể ghi nhận chấm công.");
    }
  };

  const handleCheckout = async (employee: Employee) => {
    const response = await apiClient.attendance.checkOut({
      employeeId: employee.id,
      checkOut: new Date().toISOString(),
      note: "Check-out từ dashboard",
    });

    if (response.success) {
      const today = new Date().toISOString().slice(0, 10);
      const payload = response.data as EmployeeAttendance | undefined;
      const localStamp = new Date().toISOString().replace(/[-:T.]/g, "");
      const incoming = payload ?? {
        id: `local-${employee.id}-${today}-${localStamp}`,
        employeeId: employee.id,
        workDate: today,
        checkIn: null,
        checkOut: new Date().toISOString(),
        status: "PRESENT",
        note: "Check-out từ dashboard",
      };

      setAttendanceRecords((current) => {
        const existingIndex = current.findIndex((record) => record.employeeId === employee.id && record.workDate === today);
        const nextRecord: EmployeeAttendance = {
          ...incoming,
          employeeId: employee.id,
          workDate: today,
          checkOut: incoming.checkOut ?? new Date().toISOString(),
          status: incoming.status ?? "PRESENT",
          note: incoming.note ?? "Check-out từ dashboard",
        };

        if (existingIndex >= 0) {
          const cloned = [...current];
          cloned[existingIndex] = nextRecord;
          return cloned;
        }

        return [nextRecord, ...current];
      });

      setError(null);
      alert("Đã ghi nhận check-out thành công.");
      await loadAttendanceData();
    } else {
      setError(response.error || "Không thể ghi nhận check-out.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tổng nhân viên" value={String(employees.length)} detail="Toàn bộ đội ngũ" tone="amber" icon="users" />
        <MetricCard label="Đang làm" value={String(totalActive)} detail="Đang hoạt động" tone="green" icon="active" />
        <MetricCard label="Tạm nghỉ" value={String(totalInactive)} detail="Chưa làm việc" tone="orange" icon="leave" />
        <MetricCard label="Đã nghỉ" value={String(totalResigned)} detail="Không còn làm" tone="blue" icon="calendar" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Danh sách nhân viên</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Quản lý hồ sơ, chấm công và lương nhân viên
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên, mã, email"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 pr-10 text-sm text-gray-700 outline-none transition focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:w-72"
              />
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>
            </div>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as "ALL" | EmployeeStatus)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang làm</option>
              <option value="INACTIVE">Tạm nghỉ</option>
              <option value="RESIGNED">Đã nghỉ</option>
            </select>

          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3">Nhân viên</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3">Liên hệ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Lương cơ bản</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                    Đang tải dữ liệu nhân viên...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                    Không tìm thấy nhân viên phù hợp.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className={`cursor-pointer transition hover:bg-amber-50/30 dark:hover:bg-white/[0.02] ${selectedEmployeeId === employee.id ? "bg-amber-50/40 dark:bg-amber-500/10" : ""}`}
                    onClick={() => setSelectedEmployeeId((current) => (current === employee.id ? null : employee.id))}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                          {getInitials(employee.fullName)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{employee.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{employee.code || employee.id} · {employee.position || "Nhân viên"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{employee.department || "Chưa cập nhật"}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                      <span className="block">{employee.phone || "-"}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{employee.email || "-"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[employee.status || "ACTIVE"]}`}>
                        {statusLabels[employee.status || "ACTIVE"]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(employee.baseSalary)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Ngày chấm công: {new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleQuickAttendance(employee);
                            }}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
                          >
                            Vào ca
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCheckout(employee);
                            }}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                          >
                            Ra ca
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedEmployee && (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chấm công - {selectedEmployee.fullName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lịch sử check-in / check-out của nhân viên được chọn</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/60">
                  <tr className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Check-in</th>
                    <th className="px-3 py-3">Check-out</th>
                    <th className="px-3 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu chấm công.</td>
                    </tr>
                  ) : (
                    selectedAttendance.slice(0, 10).map((record) => (
                      <tr key={record.id || `${record.employeeId}-${record.workDate}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">{formatTimeWithDate(record.checkIn)}</td>
                        <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">{formatTimeWithDate(record.checkOut)}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                            {attendanceStatusLabels[record.status] ?? record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-orange-200/80 bg-gradient-to-br from-[#fffaf3] via-[#fff7ef] to-[#f4f7ff] p-5 shadow-[0_20px_45px_rgba(251,146,60,0.18)] dark:border-orange-500/20 dark:from-[#1f120a] dark:via-[#17120d] dark:to-[#0f172a]">
            {selectedPayroll.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-gray-400">Chưa có dữ liệu lương.</div>
            ) : (() => {
              const latestPayroll = [...selectedPayroll].sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
              const periodDate = latestPayroll ? new Date(`${latestPayroll.periodStart}T00:00:00`) : new Date();
              const base = latestPayroll?.baseSalary ?? 0;
              const allowance = latestPayroll?.allowance ?? 0;
              const deduction = latestPayroll?.deduction ?? 0;
              const totalSalary = latestPayroll?.totalSalary ?? base + allowance - deduction;
              const bonus = Math.max(totalSalary - base - allowance + deduction, 0);
              const totalHours = latestPayroll?.attendanceDays ? latestPayroll.attendanceDays * 8 : 0;
              const hourlyRate = base > 0 && latestPayroll?.attendanceDays ? base / (latestPayroll.attendanceDays * 8) : 0;

              return (
                <div>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-300">Nhân viên</p>
                      <h3 className="mt-2 text-[1.9rem] font-black leading-tight text-slate-900 dark:text-white">{selectedEmployee.fullName}</h3>
                    </div>
                      <span
                        className="
                          inline-flex items-center gap-2
                          rounded-xl
                          border border-sky-200
                          bg-sky-50
                          px-3.5 py-2
                          text-sm font-bold
                          text-sky-700
                          shadow-sm
                          dark:border-sky-800
                          dark:bg-sky-950/50
                          dark:text-sky-300
                        "
                      >
                        {periodDate.toLocaleDateString("vi-VN", {
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: "Giờ làm", value: `${totalHours} giờ`, tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
                      { label: "Lương/gờ", value: formatCurrency(hourlyRate), tone: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" },
                      { label: "Lương cơ bản", value: formatCurrency(base), tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
                      { label: "Tiền thưởng", value: formatCurrency(bonus), tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
                      { label: "Phụ cấp", value: formatCurrency(allowance), tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
                      { label: "Khấu trừ", value: formatCurrency(deduction), tone: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200" },
                    ].map((item) => (
                      <div key={item.label} className={`flex items-center justify-between rounded-xl px-3 py-3 ${item.tone}`}>
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="
                    mt-5 overflow-hidden rounded-2xl
                    border border-emerald-200
                    bg-emerald-50/70 p-4
                    dark:border-emerald-500/20
                    dark:bg-emerald-500/[0.07]
                  ">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="
                          flex h-11 w-11 items-center justify-center
                          rounded-xl bg-emerald-100
                          text-emerald-600
                          dark:bg-emerald-500/20
                          dark:text-emerald-400
                        ">
                          {/* <Wallet size={22} /> */}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Thực nhận
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Tổng lương sau điều chỉnh
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-extrabold tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(totalSalary)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="
                        inline-flex items-center gap-2
                        rounded-full
                        border border-amber-200
                        bg-amber-50
                        px-4 py-2
                        text-sm font-semibold
                        text-amber-700
                        shadow-sm
                        transition-all duration-200
                        hover:border-amber-300
                        hover:bg-amber-100
                        hover:shadow-md
                        active:scale-95
                      "
                    >
                      Chờ xác nhận
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "amber" | "green" | "orange" | "blue";
  icon: "users" | "active" | "leave" | "calendar";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  };

  const paths = {
    users: <><path d="M16 18a4 4 0 0 0-8 0M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8 7a4 4 0 0 0-2.7-3.7M20 11a2 2 0 1 0 0-4M4 18a4 4 0 0 1 2.7-3.7" /></>,
    active: <><circle cx="12" cy="12" r="8" /><path d="m9.5 12 1.7 1.7 3.3-3.7" /></>,
    leave: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M8 9h8M8 13h5" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" /></>,
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {paths[icon]}
          </svg>
        </span>
      </div>
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{detail}</p>
    </div>
  );
}
