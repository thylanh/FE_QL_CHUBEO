"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiConfig";
import {
  CashbookEntry,
  EmployeePayroll,
  InventoryItem,
  Order,
} from "@/type/interface";
import { useAuth } from "@/context/AuthContext";

type ReportData = {
  orders: Order[];
  cashbook: CashbookEntry[];
  payrolls: EmployeePayroll[];
  inventory: InventoryItem[];
  revenue: number;
};

type ReportMetric = "revenue" | "cost" | "grossProfit" | "payroll" | "misc" | "other" | "profit" | "inventory";
type Targets = Partial<Record<ReportMetric, number>>;

const TARGETS_STORAGE_KEY = "bunchubeo_monthly_report_targets";
const DEFAULT_TARGETS: Targets = {
  revenue: 100_000_000,
  cost: 35_000_000,
  grossProfit: 65_000_000,
  payroll: 10_000_000,
  misc: 3_000_000,
  other: 8_000_000,
  profit: 30_000_000,
};

const currency = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

const formatCurrency = (amount: number) => `${currency.format(amount)} ₫`;
const formatSignedCurrency = (amount: number) =>
  amount < 0 ? `-${formatCurrency(Math.abs(amount))}` : formatCurrency(amount);

const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const toMonthInput = (date: Date) => toDateInput(date).slice(0, 7);

function isValidTarget(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function extractRevenue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    const amounts = value.map(extractRevenue);
    if (amounts.length > 0 && amounts.every((amount) => amount !== undefined)) {
      return amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0);
    }
    return undefined;
  }
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  for (const key of ["totalRevenue", "revenue", "totalAmount", "total", "amount"]) {
    const amount = record[key];
    if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  }
  for (const key of ["summary", "totals", "result", "data", "daily", "items", "records"]) {
    const amount = extractRevenue(record[key]);
    if (amount !== undefined) return amount;
  }
  return undefined;
}

function loadSavedTargets(): Targets {
  try {
    const saved = window.localStorage.getItem(TARGETS_STORAGE_KEY);
    if (!saved) return DEFAULT_TARGETS;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_TARGETS;
    const targets: Targets = { ...DEFAULT_TARGETS };
    for (const [key, value] of Object.entries(parsed)) {
      if (key in DEFAULT_TARGETS && isValidTarget(value)) {
        targets[key as ReportMetric] = value;
      }
    }
    return targets;
  } catch {
    return DEFAULT_TARGETS;
  }
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 0);
  return { from: toDateInput(start), to: toDateInput(end) };
}

function getPeriodOrder(order: Order, from: string, to: string) {
  const date = new Date(order.createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const dateValue = toDateInput(date);
  return dateValue >= from && dateValue <= to;
}

function getPayrollTotal(payrolls: EmployeePayroll[]) {
  return payrolls.reduce(
    (total, payroll) => total + payroll.netSalary,
    0
  );
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `Tháng ${monthNumber}/${year}`;
}

function ReportDonut({
  values,
}: {
  values: { label: string; value: number; color: string }[];
}) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const activeLabel = hoveredSegment ?? selectedSegment;
  const activeSegment = values.find((item) => item.label === activeLabel && item.value > 0);
  const segments = values
    .filter((item) => item.value > 0)
    .reduce<{ accumulated: number; items: { label: string; value: number; color: string; percentage: number; offset: number }[] }>(
      (result, item) => {
        const percentage = (item.value / total) * 100;
        return {
          accumulated: result.accumulated + percentage,
          items: [
            ...result.items,
            {
              ...item,
              percentage,
              offset: 100 - result.accumulated,
            },
          ],
        };
      },
      { accumulated: 0, items: [] }
    ).items;

  const toggleSegment = (label: string) => {
    setSelectedSegment((current) => current === label ? null : label);
  };

  if (total <= 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white text-center dark:bg-gray-900">
            <span className="text-xs text-gray-500 dark:text-gray-400">Chưa có chi phí</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
      <div className="relative mx-auto h-52 w-52">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" aria-label="Biểu đồ cơ cấu chi phí">
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-white/[0.06]" />
          {segments.map((segment, index) => {
            const isActive = activeLabel === segment.label;
            const isDimmed = activeLabel !== null && !isActive;
            return (
            <circle
              key={segment.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={segment.color}
              strokeWidth={isActive ? "10" : "8"}
              strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
              strokeDashoffset={segment.offset}
              strokeLinecap="butt"
              role="button"
              tabIndex={0}
              aria-label={`${segment.label}: ${formatCurrency(segment.value)}, ${segment.percentage.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`}
              aria-pressed={selectedSegment === segment.label}
              onMouseEnter={() => setHoveredSegment(segment.label)}
              onMouseLeave={() => setHoveredSegment(null)}
              onFocus={() => setHoveredSegment(segment.label)}
              onBlur={() => setHoveredSegment(null)}
              onClick={() => toggleSegment(segment.label)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleSegment(segment.label);
                }
              }}
              className="report-donut-segment cursor-pointer outline-none focus-visible:drop-shadow-[0_0_3px_rgba(15,23,42,0.65)]"
              style={{
                opacity: isDimmed ? 0.32 : 1,
                filter: isActive ? `drop-shadow(0 1px 3px ${segment.color}88)` : "none",
                animationDelay: `${index * 100}ms`,
              }}
            />
            );
          })}
        </svg>
        <div aria-live="polite" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {activeSegment?.label ?? "Tổng chi phí"}
          </span>
          <span className="mt-1 max-w-full text-sm font-bold text-gray-900 dark:text-white">
            {formatCurrency(activeSegment?.value ?? total)}
          </span>
          {activeSegment && (
            <span className="mt-0.5 text-xs font-medium text-gray-400">
              {((activeSegment.value / total) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {values.filter((item) => item.value > 0).map((item) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={selectedSegment === item.label}
            onMouseEnter={() => setHoveredSegment(item.label)}
            onMouseLeave={() => setHoveredSegment(null)}
            onFocus={() => setHoveredSegment(item.label)}
            onBlur={() => setHoveredSegment(null)}
            onClick={() => toggleSegment(item.label)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              activeLabel === item.label
                ? "bg-gray-50 dark:bg-white/[0.06]"
                : activeLabel
                  ? "opacity-45 hover:opacity-80"
                  : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full ring-4 ring-black/[0.03] dark:ring-white/[0.04]" style={{ backgroundColor: item.color }} />
              <span className="truncate text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
            </div>
            <div className="text-right">
              <p className="whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-white/90">{formatCurrency(item.value)}</p>
              <p className="text-xs text-gray-400">{((item.value / total) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MonthlyReport() {
  const { user } = useAuth();
  const canViewReport = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [month, setMonth] = useState(toMonthInput(new Date()));
  const [reloadKey, setReloadKey] = useState(0);
  const [report, setReport] = useState<ReportData | null>(null);
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);

  useEffect(() => {
    setTargets(loadSavedTargets());
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!canViewReport) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const { from, to } = getMonthRange(month);

    const loadReport = async () => {
      setIsLoading(true);
      setError(null);
      setReport(null);
      try {
        const [
          revenueResponse,
          ordersResponse,
          cashbookResponse,
          payrollResponse,
          inventoryResponse,
        ] = await Promise.all([
            apiClient.reports.getRevenue(from, to),
            apiClient.orders.getOrdersBetween(from, to),
            apiClient.cashbook.getEntries({ from, to }),
            apiClient.payroll.getPayrolls(undefined, month),
            apiClient.inventory.getInventory(),
          ]);

        if (!isMounted) return;
        const failures = [
          revenueResponse.success ? null : revenueResponse.error || "Không thể tải doanh thu.",
          ordersResponse.success ? null : ordersResponse.error || "Không thể tải đơn hàng.",
          cashbookResponse.success ? null : cashbookResponse.error || "Không thể tải sổ thu chi.",
          payrollResponse.success ? null : payrollResponse.error || "Không thể tải bảng lương.",
          inventoryResponse.success ? null : inventoryResponse.error || "Không thể tải tồn kho.",
        ].filter((message): message is string => message !== null);

        if (failures.length > 0) {
          setError(failures.join(" "));
          return;
        }

        if (
          !Array.isArray(ordersResponse.data) ||
          !Array.isArray(cashbookResponse.data?.entries) ||
          !Array.isArray(payrollResponse.data) ||
          !Array.isArray(inventoryResponse.data)
        ) {
          setError("Dữ liệu báo cáo không đúng định dạng API trả về.");
          return;
        }

        const revenue = extractRevenue(revenueResponse.data);
        if (revenue === undefined) {
          setError("Dữ liệu doanh thu từ API không đúng định dạng.");
          return;
        }

        setReport({
          orders: ordersResponse.data.filter((order) => getPeriodOrder(order, from, to)),
          cashbook: cashbookResponse.data.entries,
          payrolls: payrollResponse.data,
          inventory: inventoryResponse.data,
          revenue,
        });
      } catch (loadError) {
        if (!isMounted) return;
        setReport(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Đã xảy ra lỗi khi tải báo cáo."
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadReport();
    return () => {
      isMounted = false;
    };
  }, [canViewReport, month, reloadKey]);

  const totals = useMemo(() => {
    if (!report) return null;
    const completedOrders = report.orders.filter((order) => order.status === "COMPLETED");
    const revenue = report.revenue;
    const inventoryById = new Map(report.inventory.map((item) => [item.id, item]));
    const cost = completedOrders.reduce(
      (sum, order) =>
        sum +
        order.lines.reduce(
          (lineTotal, line) =>
            lineTotal +
            line.ingredients.reduce((ingredientTotal, ingredient) => {
              const inventoryItem = inventoryById.get(ingredient.ingredientId);
              return ingredientTotal + (inventoryItem ? ingredient.amount * inventoryItem.costPrice : 0);
            }, 0),
          0
        ),
      0
    );
    const expenses = report.cashbook.filter((entry) => entry.type === "EXPENSE");
    const misc = expenses
      .filter((entry) => entry.category === "MISC_PURCHASE")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const other = expenses
      .filter((entry) => entry.category === "OTHER")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const otherIncome = report.cashbook
      .filter((entry) => entry.type === "INCOME")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const cashbookNetExpense =
      expenses.reduce((sum, entry) => sum + entry.amount, 0) - otherIncome;
    const payroll = getPayrollTotal(report.payrolls);
    const inventoryValue = report.inventory.reduce(
      (sum, item) => sum + item.quantity * item.costPrice,
      0
    );
    const grossProfit = revenue - cost;
    const profit = grossProfit - payroll - cashbookNetExpense;

    return {
      revenue,
      cost,
      grossProfit,
      payroll,
      misc,
      other,
      otherIncome,
      cashbookNetExpense,
      profit,
      inventoryValue,
      expenseChart: [
        { label: "Giá vốn", value: cost, color: "#3b82f6" },
        { label: "Lương nhân viên", value: payroll, color: "#ef4444" },
        { label: "Tổng chi phí sổ thu chi", value: misc, color: "#f59e0b" },
        { label: "Chi phí khác", value: other, color: "#22a35a" },
      ],
    };
  }, [report]);

  const reportRows: {
    key: ReportMetric;
    label: string;
    actual?: number;
    target?: number;
    emphasis?: "positive" | "negative";
  }[] = [
    { key: "revenue", label: "Doanh thu", actual: totals?.revenue, emphasis: "positive" },
    { key: "cost", label: "Giá vốn", actual: totals?.cost },
    { key: "grossProfit", label: "Lãi gộp", actual: totals?.grossProfit, emphasis: "positive" },
    { key: "payroll", label: "Lương nhân viên", actual: totals?.payroll },
    { key: "misc", label: "Tổng chi phí sổ thu chi", actual: totals?.cashbookNetExpense },
    // { key: "other", label: "Chi phí khác", actual: totals?.other },
    { key: "profit", label: "Lợi nhuận", actual: totals?.profit, emphasis: "positive" },
    { key: "inventory", label: "Tồn kho", actual: totals?.inventoryValue },
  ];

  const updateTarget = (key: ReportMetric, value: string) => {
    const parsed = value === "" ? 0 : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setTargetError("Chỉ tiêu phải là số không âm.");
      return;
    }
    const nextTargets = { ...targets, [key]: parsed };
    setTargets(nextTargets);
    setTargetError(null);
    try {
      window.localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(nextTargets));
    } catch {
      setTargetError("Không thể lưu chỉ tiêu trên trình duyệt này.");
    }
  };

  if (!canViewReport) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        Bạn không có quyền truy cập báo cáo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
<section
  className="relative isolate overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl sm:px-8"
  style={{
    background: "linear-gradient(120deg, #047857 0%, #0f766e 45%, #3730a3 100%)",
    color: "#ffffff",
  }}
>
  {/* Ánh sáng trang trí */}
  <div
    className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full blur-3xl"
    style={{ background: "rgba(45, 212, 191, 0.25)" }}
  />
  <div
    className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full blur-3xl"
    style={{ background: "rgba(129, 140, 248, 0.25)" }}
  />

  <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <span
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
        style={{
          backgroundColor: "rgba(255,255,255,0.16)",
          borderColor: "rgba(255,255,255,0.25)",
          color: "#ecfdf5",
        }}
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-lime-300" />
        Báo cáo vận hành
      </span>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Báo cáo &amp; thống kê
      </h1>

      <p className="mt-2 text-sm" style={{ color: "#d1fae5" }}>
        Theo dõi doanh thu, chi phí, lợi nhuận và tồn kho theo tháng.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white">
          📊 Doanh thu
        </span>
        <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white">
          💰 Chi phí
        </span>
        <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white">
          📦 Tồn kho
        </span>
      </div>
    </div>

    <label className="block text-sm font-semibold" style={{ color: "#ffffff" }}>
      <span className="mb-2 block">📅 Tháng báo cáo</span>
      <input
        type="month"
        value={month}
        onChange={(event) =>
          setMonth(event.target.value || toMonthInput(new Date()))
        }
        className="mt-2 block h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition focus:ring-4 sm:w-52"
        style={{
          backgroundColor: "#ffffff",
          color: "#134e4a",
          borderColor: "#ccfbf1",
          colorScheme: "light",
        }}
      />
    </label>
  </div>
</section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-100 dark:border-red-400/30 dark:hover:bg-red-500/10">
            Thử tải lại
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Chỉ tiêu tháng</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {formatMonth(month)}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Số thực tế lấy từ API đơn hàng, sổ thu chi, bảng lương và kho. Có thể chỉnh sửa mục tiêu ngay trong bảng.
          </p>
        </div>
        {targetError && <p role="alert" className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{targetError}</p>}
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-5 py-3.5">Chỉ tiêu</th>
                <th className="px-5 py-3.5 text-right">Thực tế</th>
                <th className="px-5 py-3.5 text-right">Mục tiêu</th>
                <th className="px-5 py-3.5 text-right">% hoàn thành</th>
                <th className="px-5 py-3.5 text-right">Chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
              {reportRows.map((row) => {
                const target = targets[row.key];
                const actual = row.actual;
                const progress = target && actual !== undefined ? (actual / target) * 100 : null;
                const difference = target !== undefined && actual !== undefined ? actual - target : null;
                const isProfit = row.key === "profit";
                return (
                  <tr key={row.key} className={`${isProfit ? "bg-amber-50/70 font-semibold dark:bg-amber-500/[0.06]" : "hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"} transition-colors`}>
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">
                      <span className="flex items-center gap-2">
                        {isProfit && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                        {row.label}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-right tabular-nums ${isLoading ? "text-gray-400" : row.emphasis === "positive" && (actual ?? 0) >= 0 ? "text-emerald-700 dark:text-emerald-300" : row.key === "profit" && (actual ?? 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {isLoading ? "Đang tải..." : actual === undefined ? "—" : row.key === "misc" ? formatSignedCurrency(actual) : formatCurrency(actual)}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {row.key === "inventory" ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <label className="inline-flex items-center justify-end gap-1">
                          <span className="sr-only">Mục tiêu {row.label}</span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={target ?? 0}
                            onChange={(event) => updateTarget(row.key, event.target.value)}
                            className="h-9 w-36 rounded-lg border border-gray-200 bg-white px-2 text-right text-sm tabular-nums text-gray-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-gray-900 dark:text-gray-200"
                          />
                          <span className="text-xs text-gray-400">₫</span>
                        </label>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {progress === null ? "—" : `${progress.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`}
                    </td>
                    <td className={`px-5 py-3.5 text-right tabular-nums ${difference === null ? "text-gray-400" : difference > 0 ? "text-amber-700 dark:text-amber-300" : difference < 0 ? "text-gray-600 dark:text-gray-400" : "text-gray-500"}`}>
                      {difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatCurrency(difference)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <span>Chỉ tiêu được lưu trên trình duyệt này.</span>
          <span>Thu khác trong sổ được cộng vào lợi nhuận.</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Cơ cấu chi phí</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tỷ trọng giá vốn, lương và khoản chi được ghi trong sổ thu chi. Chi phí khác được gộp theo danh mục đang thực hiện hỗ trợ.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Đang tổng hợp chi phí...</div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Không thể hiển thị biểu đồ khi API chưa trả đủ dữ liệu.</div>
          ) : totals ? (
            <ReportDonut values={totals.expenseChart} />
          ) : null}
          {!isLoading && !error && (
            <p className="mt-5 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Giá vốn ước tính từ lượng nguyên liệu trong đơn hàng nhân với đơn giá hiện tại trong kho.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
