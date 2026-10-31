"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Order } from "@/type/interface";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type MonthlyTargetProps = {
  orders: Order[];
  isLoading?: boolean;
  error?: string | null;
};

const DAILY_MEAL_TARGET = 100;

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount)} ₫`;

export default function MonthlyTarget({ orders, isLoading = false, error = null }: MonthlyTargetProps) {
  const metrics = useMemo(() => {
    const completedOrders = orders.filter((order) => order.status === "COMPLETED");
    const soldItems = completedOrders.reduce(
      (total, order) =>
        total + order.lines.reduce((orderTotal, line) => orderTotal + line.quantity, 0),
      0
    );
    const revenue = completedOrders.reduce((total, order) => total + order.total, 0);

    return {
      soldItems,
      revenue,
      completedOrderCount: completedOrders.length,
      progress: Math.min(100, (soldItems / DAILY_MEAL_TARGET) * 100),
    };
  }, [orders]);

  const series = [metrics.progress];
  const progressLabel = Number.isInteger(metrics.progress)
    ? metrics.progress.toString()
    : metrics.progress.toFixed(1);
  const options: ApexOptions = {
    colors: ["#f59e0b"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "80%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: "#1D2939",
            formatter: (value) => `${Math.round(value)}%`,
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#f59e0b"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Tiến độ"],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="rounded-2xl bg-white px-5 pb-11 pt-5 shadow-default dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Chỉ tiêu bán hàng hôm nay
          </h3>
          <p className="mt-1 text-theme-sm font-normal text-gray-500 dark:text-gray-400">
            Mục tiêu {DAILY_MEAL_TARGET.toLocaleString("vi-VN")} suất / ngày
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="relative">
          <div className="flex min-h-[330px] items-center justify-center">
            {isLoading ? (
              <div className="h-52 w-52 animate-pulse rounded-full border-[18px] border-gray-100 dark:border-gray-800" aria-label="Đang tải biểu đồ" />
            ) : error ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Biểu đồ chưa thể hiển thị do chưa tải được dữ liệu.
              </p>
            ) : (
              <ReactApexChart
                options={options}
                series={series}
                type="radialBar"
                height={330}
              />
            )}
          </div>
          <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            {isLoading ? "Đang tải..." : error ? "Chưa có dữ liệu" : `${progressLabel}% hoàn thành`}
          </span>
        </div>

        <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          {isLoading ? (
            "Đang tải số liệu đơn hàng hôm nay..."
          ) : error ? (
            "Chưa thể lấy số liệu bán hàng từ máy chủ."
          ) : (
            <>
              Hôm nay đã bán{" "}
              <strong>{metrics.soldItems.toLocaleString("vi-VN")} suất</strong>{" "}
              trong {metrics.completedOrderCount.toLocaleString("vi-VN")} đơn hoàn thành.
              Doanh thu đạt <strong>{formatCurrency(metrics.revenue)}</strong>.
            </>
          )}
        </p>
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        <div>
          <p className="mb-1 text-center text-theme-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Chỉ tiêu
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {DAILY_MEAL_TARGET.toLocaleString("vi-VN")} suất
          </p>
        </div>

        <div className="h-7 w-px bg-gray-200 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-theme-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Đã bán
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-amber-600 dark:text-amber-400 sm:text-lg">
            {isLoading || error ? "—" : `${metrics.soldItems.toLocaleString("vi-VN")} suất`}
          </p>
        </div>

        <div className="h-7 w-px bg-gray-200 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-theme-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Doanh thu
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-emerald-600 dark:text-emerald-400 sm:text-lg">
            {isLoading || error ? "—" : formatCurrency(metrics.revenue)}
          </p>
        </div>
      </div>
    </div>
  );
}
