"use client";

import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  // Nếu đang kiểm tra phiên làm việc hoặc người dùng đã đăng nhập, hiển thị màn hình chờ chuyển hướng mượt mà
  if (isLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-2xl shadow-xl shadow-amber-500/25 animate-bounce">
            🥢
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {user
              ? "Bạn đã đăng nhập. Đang chuyển hướng vào hệ thống..."
              : "Đang kiểm tra phiên làm việc..."}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span className="text-xs text-gray-400">Vui lòng chờ giây lát</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
        {children}
        <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
          <div className="relative items-center justify-center flex z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center max-w-xs text-center">
              <Link href="/" className="block mb-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-3xl shadow-xl shadow-amber-500/25">
                  🥢
                </span>
              </Link>
              <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
                Bún Đậu Chú Béo
              </h2>
              <p className="text-gray-400 dark:text-white/60 text-sm leading-relaxed">
                Hệ thống quản lý chuỗi cửa hàng, đơn hàng, thực đơn và doanh thu tập trung
              </p>
            </div>
          </div>
        </div>
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
