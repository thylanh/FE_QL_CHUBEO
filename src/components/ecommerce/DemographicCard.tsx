"use client";

import { useState } from "react";
import { MoreDotIcon } from "@/icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

export default function DemographicCard() {
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const topItems = [
    {
      name: "Bún Đậu Thập Cẩm 2 Người",
      price: "90.000đ",
      sales: "72 suất",
      icon: "🍱",
    },
    {
      name: "Bún Đậu 1 Người Đặc Biệt",
      price: "50.000đ",
      sales: "48 suất",
      icon: "✨",
    },
    {
      name: "Dồi sụn rán giòn thêm",
      price: "25.000đ",
      sales: "34 phần",
      icon: "🍢",
    },
    {
      name: "Trà tắc hạt chia",
      price: "15.000đ",
      sales: "65 ly",
      icon: "🍹",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Món Ăn Bán Chạy Nhất 🏆
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Thống kê tỉ lệ gọi món tại Bún Đậu Chú Béo
          </p>
        </div>

        <div className="relative inline-block">
          <button onClick={toggleDropdown} className="dropdown-toggle">
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Xem báo cáo
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Xuất dữ liệu
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="space-y-5">
        {topItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl dark:bg-amber-950/40">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                  {item.name}
                </p>
                <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                  Giá: {item.price} • Đã bán {item.sales}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
