"use client";

import { useMemo } from "react";
import { Order } from "@/type/interface";

type MetricColor = "amber" | "orange" | "emerald" | "sky";

type EcommerceMetricsProps = {
  orders: Order[];
  isLoading?: boolean;
  error?: string | null;
};

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount)} ₫`;

export const EcommerceMetrics = ({ orders, isLoading = false, error = null }: EcommerceMetricsProps) => {
  const metrics = useMemo(() => {
    const completedOrders = orders.filter((order) => order.status === "COMPLETED");

    return {
      revenue: completedOrders.reduce((total, order) => total + order.total, 0),
      soldItems: completedOrders.reduce(
        (total, order) =>
          total + order.lines.reduce((orderTotal, line) => orderTotal + line.quantity, 0),
        0
      ),
      dineInRevenue: completedOrders
        .filter((order) => order.orderType === "Tại quán")
        .reduce((total, order) => total + order.total, 0),
      takeawayDeliveryRevenue: completedOrders
        .filter((order) => order.orderType === "Mang đi" || order.orderType === "Giao hàng")
        .reduce((total, order) => total + order.total, 0),
      completedOrderCount: completedOrders.length,
    };
  }, [orders]);

  const cards: {
    label: string;
    value: string;
    detail: string;
    icon: string;
    color: MetricColor;
  }[] = [
    {
      label: "Doanh thu",
      value: formatCurrency(metrics.revenue),
      detail: `Tổng doanh thu từ ${metrics.completedOrderCount} đơn hàng.`,
      icon: "💰",
      color: "amber",
    },
    {
      label: "Số món đã bán",
      value: metrics.soldItems.toLocaleString("vi-VN"),
      detail: `Số món đã bán từ đơn hàng.`,
      icon: "🥢",
      color: "orange",
    },
    {
      label: "Tại quán",
      value: formatCurrency(metrics.dineInRevenue),
      detail: `Tổng doanh thu từ đơn hàng tại quán.`,
      icon: "🪑",
      color: "emerald",
    },
    {
      label: "Mang đi",
      value: formatCurrency(metrics.takeawayDeliveryRevenue),
      detail: `Đơn hàng mang đi và giao hàng.`,
      icon: "🛵",
      color: "sky",
    },
  ];

  const colors = {
    amber: "border-amber-200/60 from-white to-amber-50/30 hover:border-amber-300 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900",
    orange: "border-orange-200/60 from-white to-orange-50/30 hover:border-orange-300 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900",
    emerald: "border-emerald-200/60 from-white to-emerald-50/30 hover:border-emerald-300 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900",
    sky: "border-sky-200/60 from-white to-sky-50/30 hover:border-sky-300 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900",
  };
  const iconColors = {
    amber: "bg-amber-100/80 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    orange: "bg-orange-100/80 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    emerald: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    sky: "bg-sky-100/80 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  };

  return (
    <section aria-busy={isLoading} aria-label="Chỉ số kinh doanh hôm nay">
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`group rounded-2xl border bg-gradient-to-b p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${colors[card.color]}`}
          >
            <div className="flex items-center justify-between">
              <div
                aria-hidden="true"
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-xs ${iconColors[card.color]}`}
              >
                {card.icon}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {card.label}
              </span>
              <h3 className="mt-1 text-base font-black text-gray-900 dark:text-white">
                {isLoading || error ? "—" : card.value}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {isLoading || error ? (error ? "Không thể lấy số liệu từ máy chủ" : "Đang tải số liệu...") : card.detail}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
