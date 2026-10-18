"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { apiClient } from "@/lib/apiConfig";
import { Order } from "@/type/interface";

export default function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    apiClient.orders.getOrders().then((response) => {
      if (!isMounted) return;
      if (response.success && response.data) {
        setOrders(response.data.slice(0, 5));
      } else {
        setError(response.error || "Không thể tải danh sách đơn hàng.");
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const statusLabels: Record<Order["status"], string> = {
    PENDING: "Chờ xử lý",
    PROCESSING: "Đang chế biến",
    COMPLETED: "Đã hoàn tất",
    CANCELLED: "Đã hủy",
  };

  const statusColors: Record<Order["status"], "success" | "info" | "error" | "warning"> = {
    PENDING: "info",
    PROCESSING: "warning",
    COMPLETED: "success",
    CANCELLED: "error",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <span>📋 Đơn Hàng Tại Quán</span>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-300 font-normal">
              {orders.filter((order) => order.status === "PROCESSING").length} đơn đang chế biến
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-theme-sm font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 transition-all hover:scale-[1.02]">
            <span>➕</span> Tạo Đơn Gọi Món
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y bg-gray-50/50 dark:bg-gray-900/50">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Mã đơn / Vị trí
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Người tạo đơn
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Chi tiết món gọi
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Tổng tiền
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Trạng thái
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <TableRow><TableCell className="py-6 text-center text-gray-500">Đang tải dữ liệu...</TableCell></TableRow>
            )}
            {!isLoading && error && (
              <TableRow><TableCell className="py-6 text-center text-red-500">{error}</TableCell></TableRow>
            )}
            {!isLoading && !error && orders.length === 0 && (
              <TableRow><TableCell className="py-6 text-center text-gray-500">Chưa có đơn hàng.</TableCell></TableRow>
            )}
            {!isLoading && !error && orders.map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                <TableCell className="py-3.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-theme-sm">
                      #{order.id}
                    </span>
                    <span className="text-gray-800 font-medium text-theme-xs dark:text-white/90">
                      {order.table || order.orderType}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {order.createdBy || "Khách lẻ"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex flex-col max-w-[220px]">
                    <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {order.lines.map((item) => `${item.quantity} ${item.name}`).join(" + ")}
                    </span>
                    <span className="text-gray-400 text-[11px] italic">
                      {order.note ? `Ghi chú: ${order.note}` : ""}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 font-bold text-gray-800 dark:text-white/90 text-theme-sm">
                  {new Intl.NumberFormat("vi-VN").format(order.total)}đ
                </TableCell>
                <TableCell className="py-3.5">
                  <Badge
                    size="sm"
                    color={
                      statusColors[order.status]
                    }
                  >
                    {statusLabels[order.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div >
  );
}
