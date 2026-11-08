"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/apiConfig";

export default function EmployeeAccountForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STAFF",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.username.trim()) {
      setError("Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên hiển thị.");
      return;
    }
    if (!form.email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!form.password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }
    if (form.password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.auth.register({
        username: form.username.trim(),
        displayName: form.name.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role as "ADMIN" | "MANAGER" | "STAFF",
      });

      if (response.success) {
        setForm({
          username: "",
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "STAFF",
        });
        router.push("/employees");
        return;
      }

      setError(response.error || "Tạo tài khoản thất bại. Vui lòng thử lại.");
    } catch {
      setError("Đã xảy ra lỗi khi tạo tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tạo tài khoản nhân viên</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tạo tài khoản mới để gắn với hồ sơ nhân viên riêng.
          </p>
        </div>
        <Link href="/employees" className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          Quay lại danh sách
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Tên đăng nhập</span>
            <input
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="nv_a"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Tên hiển thị</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Nguyễn Văn A"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="nv.a@company.com"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Vai trò</span>
            <select
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <option value="STAFF">Nhân viên</option>
              <option value="MANAGER">Quản lý</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Mật khẩu</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Nhập mật khẩu"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Xác nhận mật khẩu</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setForm({ username: "", name: "", email: "", password: "", confirmPassword: "", role: "STAFF" })} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Làm mới
          </button>
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Đang lưu..." : "Tạo tài khoản"}
          </button>
        </div>
      </form>
    </div>
  );
}
