"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, type OrderPeriod } from "@/lib/apiConfig";
import { Order, OrderStatus } from "@/type/interface";

type StatusFilter = "ALL" | OrderStatus;
type DateFilter = "today" | "7days" | "month";
type UpdatableOrderStatus = Extract<OrderStatus, "PROCESSING" | "COMPLETED" | "CANCELLED">;

const toOrderPeriod = (filter: DateFilter): OrderPeriod =>
  filter === "7days" ? "week" : filter;

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chế biến",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  CONFIRMED: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
  PROCESSING: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  CANCELLED: "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-600",
};

const nextStatusByCurrent: Partial<Record<OrderStatus, UpdatableOrderStatus>> = {
  PENDING: "PROCESSING",
  CONFIRMED: "PROCESSING",
  PROCESSING: "COMPLETED",
};

const currency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount) +
  "₫";

const formatOrderTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  return `${time} - ${day}`;
};

function ClipboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <rect x="5" y="5" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 5.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M9 11h6m-6 4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function StatusDot({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = {
    PENDING: "bg-amber-500",
    CONFIRMED: "bg-sky-500",
    PROCESSING: "bg-orange-500",
    COMPLETED: "bg-emerald-500",
    CANCELLED: "bg-gray-400",
  };
  return <span className={`h-2 w-2 rounded-full ${colors[status]}`} />;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [page, setPage] = useState(1);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const pageSize = 8;
  const cancelOrder = orders.find((order) => order.id === cancelOrderId);

  const loadOrders = useCallback(async (period: OrderPeriod) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.orders.getOrders(period);
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setError(response.error || "Không thể tải danh sách đơn hàng.");
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Đã xảy ra lỗi khi tải đơn hàng."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders(toOrderPeriod(dateFilter));
  }, [dateFilter, loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi");

    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;

      if (!normalizedSearch) return true;
      const searchableText = [
        order.code,
        order.table,
        order.orderType,
        order.createdBy,
        ...order.lines.map((line) => line.name),
      ]
        .join(" ")
        .toLocaleLowerCase("vi");
      return searchableText.includes(normalizedSearch);
    });
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const visibleOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, search, statusFilter]);

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((order) => order.status === "PENDING").length,
    processing: orders.filter((order) => order.status === "PROCESSING").length,
    completed: orders.filter((order) => order.status === "COMPLETED").length,
    revenue: orders
      .filter((order) => order.status === "COMPLETED")
      .reduce((total, order) => total + order.total, 0),
  }), [orders]);

  const handleStatusChange = async (order: Order, nextStatus: UpdatableOrderStatus) => {
    if (order.status === nextStatus) return false;
    setUpdatingOrder(order.id);
    setError(null);
    try {
      const response = await apiClient.orders.updateStatus(order.id, nextStatus);
      if (!response.success) {
        setError(response.error || `Không thể cập nhật đơn #${order.code}.`);
        return false;
      }
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, ...(response.data ?? {}), status: nextStatus }
            : item
        )
      );
      return true;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : `Đã xảy ra lỗi khi cập nhật đơn #${order.code}.`
      );
      return false;
    } finally {
      setUpdatingOrder(null);
    }
  };

  const confirmCancelOrder = async () => {
    if (
      !cancelOrder ||
      cancelOrder.status === "COMPLETED" ||
      cancelOrder.status === "CANCELLED" ||
      updatingOrder
    ) {
      return;
    }

    const cancelled = await handleStatusChange(cancelOrder, "CANCELLED");
    if (cancelled) setCancelOrderId(null);
  };
  const tabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: "Tất cả đơn", value: "ALL", count: counts.all },
    { label: "Chờ xác nhận", value: "PENDING", count: counts.pending },
    { label: "Đã xác nhận", value: "CONFIRMED", count: orders.filter((order) => order.status === "CONFIRMED").length },
    { label: "Đang chế biến", value: "PROCESSING", count: counts.processing },
    { label: "Hoàn thành", value: "COMPLETED", count: counts.completed },
    { label: "Đã hủy", value: "CANCELLED", count: orders.filter((order) => order.status === "CANCELLED").length },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tổng đơn hàng" value={counts.all.toLocaleString("vi-VN")} detail="Trong khoảng thời gian đã chọn" tone="amber" icon="orders" />
        <MetricCard label="Chờ xác nhận" value={counts.pending.toLocaleString("vi-VN")} detail="Cần được xử lý sớm" tone="blue" icon="pending" />
        <MetricCard label="Đang chế biến" value={counts.processing.toLocaleString("vi-VN")} detail="Đơn đang thực hiện" tone="orange" icon="cooking" />
        <MetricCard label="Doanh thu hoàn tất" value={currency(counts.revenue)} detail="Từ các đơn đã hoàn thành" tone="green" icon="revenue" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 pt-4 dark:border-gray-800 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
            <ClipboardIcon />
            <h2>Danh sách đơn hàng</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">{filteredOrders.length}</span>
          </div>
          <div className="mt-4 flex gap-5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-0.5 pb-3 text-sm font-semibold transition ${
                  statusFilter === tab.value
                    ? "border-amber-500 text-amber-700 dark:text-amber-400"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${statusFilter === tab.value ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <label htmlFor="orders-date-filter" className="sr-only">Lọc theo thời gian</label>
            <select
              id="orders-date-filter"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
            >
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày gần đây</option>
              <option value="month">Tháng này</option>
            </select>
            <button
              onClick={() => void loadOrders(toOrderPeriod(dateFilter))}
              disabled={isLoading}
              aria-label="Làm mới danh sách đơn hàng"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg aria-hidden="true" className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none"><path d="M20 7v5h-5M4 17v-5h5m10-3A7 7 0 0 0 6.2 7L4 9m16 6-2.2 2A7 7 0 0 1 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 sm:mx-6">
            <span>{"thao tác không hợp lệ"}</span>
            <button onClick={() => void loadOrders(toOrderPeriod(dateFilter))} className="font-semibold underline underline-offset-2">Thử tải lại</button>
          </div>
        )}

        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="bg-gray-50/80 dark:bg-gray-800/40">
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-6 py-3">Mã đơn</th>
                <th className="px-4 py-3">Người tạo / Bàn</th>
                <th className="px-4 py-3">Món đã gọi</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && orders.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                  <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  Đang tải danh sách đơn hàng...
                </td></tr>
              )}
              {!isLoading && !error && visibleOrders.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800"><ClipboardIcon /></div>
                  <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Chưa tìm thấy đơn hàng</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
                </td></tr>
              )}
              {visibleOrders.map((order) => {
                const itemCount = order.lines.reduce((total, line) => total + line.quantity, 0);
                const isExpanded = expandedOrder === order.id;
                return (
                  <OrderRows
                    key={order.id}
                    order={order}
                    itemCount={itemCount}
                    isExpanded={isExpanded}
                    isUpdating={updatingOrder === order.id}
                    onToggle={() => setExpandedOrder(isExpanded ? null : order.id)}
                    onAdvance={() => {
                      const nextStatus = nextStatusByCurrent[order.status];
                      if (nextStatus && nextStatus !== "CANCELLED") {
                        void handleStatusChange(order, nextStatus);
                      }
                    }}
                    onCancel={() => {
                      setError(null);
                      setCancelOrderId(order.id);
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Hiển thị <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredOrders.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredOrders.length)}</span> trong số <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredOrders.length}</span> đơn hàng
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >Trước</button>
            <span className="px-2 text-sm text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >Sau</button>
          </div>
        </div>
      </section>
      {cancelOrder &&
        cancelOrder.status !== "COMPLETED" &&
        cancelOrder.status !== "CANCELLED" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget && !updatingOrder) {
                setCancelOrderId(null);
              }
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cancel-order-title"
              aria-describedby="cancel-order-description"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M12 8v5m0 3h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 id="cancel-order-title" className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                Xác nhận hủy đơn hàng
              </h2>
              <p id="cancel-order-description" className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Bạn có chắc chắn muốn hủy đơn <strong>#{cancelOrder.code}</strong> với tổng tiền{" "}
                <strong>{currency(cancelOrder.total)}</strong>? Thao tác này không thể hoàn tác.
              </p>
              {error && (
                <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelOrderId(null)}
                  disabled={Boolean(updatingOrder)}
                  autoFocus
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={() => void confirmCancelOrder()}
                  disabled={Boolean(updatingOrder)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingOrder === cancelOrder.id && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Xác nhận hủy đơn
                </button>
              </div>
            </section>
          </div>
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
  tone: "amber" | "blue" | "orange" | "green";
  icon: "orders" | "pending" | "cooking" | "revenue";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  };
  const paths = {
    orders: <><path d="M7 4.5h10a2 2 0 0 1 2 2v13H5v-13a2 2 0 0 1 2-2Z" /><path d="M9 4.5V3h6v1.5M8.5 9h7M8.5 13h7M8.5 17h4" /></>,
    pending: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    cooking: <><path d="M4 14h16l-1.5 6h-13L4 14ZM6 14a6 6 0 0 1 12 0M9 5c0-1 1-1.5 1-2.5M14 5c0-1 1-1.5 1-2.5" /></>,
    revenue: <><path d="M12 3v18m4-14.5C16 5.1 14.2 4 12 4s-4 1.1-4 2.5S9.8 9 12 9s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" /></>,
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg>
        </span>
      </div>
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{detail}</p>
    </div>
  );
}

function OrderRows({
  order,
  itemCount,
  isExpanded,
  isUpdating,
  onToggle,
  onAdvance,
  onCancel,
}: {
  order: Order;
  itemCount: number;
  isExpanded: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const nextStatus = nextStatusByCurrent[order.status];

  return (
    <>
      <tr className="group transition hover:bg-amber-50/30 dark:hover:bg-white/[0.025]">
        <td className="px-6 py-4">
          <button onClick={onToggle} className="text-left">
            <span className="font-bold text-gray-900 transition group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400">#{order.code}</span>
            <span className="mt-1 block text-xs text-gray-400">{order.orderType}</span>
          </button>
        </td>
        <td className="px-4 py-4">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{order.createdBy || "Khách lẻ"}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{order.table || order.orderType} <span className="text-gray-300 dark:text-gray-600">·</span> {order.customerCount || 1} khách</p>
        </td>
        <td className="px-4 py-4">
          <p className="max-w-[230px] truncate text-sm font-medium text-gray-700 dark:text-gray-200">{order.lines.slice(0, 2).map((line) => `${line.quantity}x${line.name}`).join(", ") || "Chưa có món"}</p>
          <p className="mt-1 text-xs text-gray-400">{itemCount} món{order.lines.length > 2 ? ` · +${order.lines.length - 2} loại khác` : ""}</p>
        </td>
        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">{formatOrderTime(order.createdAt)}</td>
        <td className="px-4 py-4 text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{currency(order.total)}</p>
          {order.serviceFee > 0 && <p className="mt-1 text-[11px] text-gray-400">Phí {currency(order.serviceFee)}</p>}
        </td>
        <td className="px-4 py-4">
          <button
            type="button"
            onClick={onAdvance}
            disabled={isUpdating || !nextStatus}
            aria-label={nextStatus ? `Chuyển đơn ${order.code} sang ${statusLabels[nextStatus]}` : `Đơn ${order.code} ${statusLabels[order.status].toLocaleLowerCase("vi")}`}
            title={nextStatus ? `Chuyển sang ${statusLabels[nextStatus]}` : statusLabels[order.status]}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition disabled:cursor-default ${statusStyles[order.status]} ${nextStatus ? "cursor-pointer hover:brightness-95" : ""}`}
          >
            <StatusDot status={order.status} />{statusLabels[order.status]}
          </button>
        </td>
        <td className="px-6 py-4 text-right">
          {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isUpdating}
              aria-label={`Hủy đơn ${order.code}`}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Hủy đơn
            </button>
          )}
          {isUpdating && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-transparent align-middle" />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-amber-50/40 dark:bg-amber-400/[0.03]">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Chi tiết món</p>
                <ul className="space-y-1.5">
                  {order.lines.map((line) => (
                    <li key={line.menuItemId} className="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-200">
                      <span> <span className="text-gray-400">× {line.quantity}</span> {line.name}</span>
                      <span className="font-medium">{currency(line.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ghi chú đơn hàng</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">{order.note || "Không có ghi chú."}</p>
                <p className="mt-2 text-xs text-gray-400">Người tạo: {order.createdBy || "Khách lẻ"}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
