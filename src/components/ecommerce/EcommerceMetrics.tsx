"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { ArrowDownIcon, ArrowUpIcon } from "@/icons";

export const EcommerceMetrics = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
      {/* <!-- Metric Item Start --> */}
      <div className="group rounded-2xl border border-amber-200/60 bg-gradient-to-b from-white to-amber-50/30 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-300 dark:border-gray-800 dark:bg-white/[0.03] dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100/80 rounded-2xl text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-2xl shadow-xs">
            💰
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            +14.2%
          </Badge>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Doanh thu hôm nay
          </span>
          <h4 className="mt-1 text-base font-black text-gray-900 dark:text-white">
            5.900.000
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="group rounded-2xl border border-orange-200/60 bg-gradient-to-b from-white to-orange-50/30 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-300 dark:border-gray-800 dark:bg-white/[0.03] dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100/80 rounded-2xl text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 text-2xl shadow-xs">
            🥢
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            +8.5%
          </Badge>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Tổng suất bún đã bán
          </span>
          <h4 className="mt-1 text-base font-black text-gray-900 dark:text-white">
            168 <span className="text-sm font-normal text-gray-500">suất</span>
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="group rounded-2xl border border-emerald-200/60 bg-gradient-to-b from-white to-emerald-50/30 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 dark:border-gray-800 dark:bg-white/[0.03] dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-12 h-12 bg-emerald-100/80 rounded-2xl text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-2xl shadow-xs">
            🪑
          </div>
          <Badge color="error">
            <ArrowDownIcon />
            60%
          </Badge>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Doanh thu tại chỗ
          </span>
          <h4 className="mt-1 text-base font-black text-gray-900 dark:text-white">
            3.400.000
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="group rounded-2xl border border-sky-200/60 bg-gradient-to-b from-white to-sky-50/30 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-sky-300 dark:border-gray-800 dark:bg-white/[0.03] dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-12 h-12 bg-sky-100/80 rounded-2xl text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 text-2xl shadow-xs">
            🛵
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            +18.0%
          </Badge>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Doanh thu ròng qua app
          </span>
          <h4 className="mt-1 text-base font-black text-gray-900 dark:text-white">
            2.500.000
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
};
