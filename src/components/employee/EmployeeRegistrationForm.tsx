"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiConfig";
import type { User } from "@/type/interface";

type EmployeeFormState = {
  userId: string;
  code: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  hireDate: string;
  status: "ACTIVE" | "INACTIVE" | "RESIGNED";
  baseSalary: number;
};

const initialForm: EmployeeFormState = {
  userId: "",
  code: "",
  fullName: "",
  email: "",
  phone: "",
  position: "",
  hireDate: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
  baseSalary: 23000,
};

export default function EmployeeRegistrationForm() {
  const router = useRouter();
  const [form, setForm] = useState<EmployeeFormState>(initialForm);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      const response = await apiClient.auth.getUsers();
      if (response.success && response.data) {
        setUsers(Array.isArray(response.data) ? response.data : [response.data]);
      }
      setLoadingUsers(false);
    };

    void loadUsers();
  }, []);

  const updateField = <K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const generateEmployeeCode = (userId: string) => {
    const sanitized = (userId || "").replace(/[^A-Za-z0-9]/g, "");
    if (!sanitized) {
      const fallback = Math.random().toString(36).replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase();
      return `NV_${fallback || "USER"}`;
    }

    const start = Math.max(0, Math.floor((sanitized.length - 4) / 2));
    const codePart = sanitized.slice(start, start + 4).toUpperCase();
    return `NV_${codePart || sanitized.slice(0, 4).toUpperCase()}`;
  };

  const handleUserSelect = (userId: string) => {
    updateField("userId", userId);

    if (!userId) {
      setForm((current) => ({
        ...current,
        code: generateEmployeeCode(""),
        fullName: "",
        email: "",
      }));
      return;
    }

    const selectedUser = users.find((user) => user.id === userId);
    if (!selectedUser) {
      setForm((current) => ({ ...current, code: generateEmployeeCode(userId) }));
      return;
    }

    setForm((current) => ({
      ...current,
      userId,
      code: generateEmployeeCode(userId),
      fullName: selectedUser.name || "",
      email: selectedUser.email || "",
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.fullName.trim()) {
      setError("Vui lòng nhập họ tên nhân viên.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.employees.createEmployee({
        userId: form.userId.trim() || undefined,
        code: form.code.trim() || undefined,
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        position: form.position.trim() || undefined,
        hireDate: form.hireDate || undefined,
        status: form.status,
        baseSalary: Number(form.baseSalary) || 0,
      });

      if (response.success) {
        setSuccess("Đăng ký nhân viên thành công.");
        setForm(initialForm);
        router.push("/employees");
        return;
      }

      setError(response.error || "Đăng ký nhân viên thất bại. Vui lòng thử lại.");
    } catch {
      setError("Đã xảy ra lỗi trong quá trình tạo nhân viên.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Đăng ký nhân viên</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tạo hồ sơ nhân viên mới theo yêu cầu nghiệp vụ của hệ thống.
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

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Tài khoản Cập nhật</span>
            <select
              value={form.userId}
              onChange={(event) => handleUserSelect(event.target.value)}
              disabled={loadingUsers}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <option value="">Chọn tài khoản</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email || user.id})
                </option>
              ))}
            </select>
          </label>

          <Field label="Họ tên (Không sửa)" value={form.fullName} onChange={(value) => updateField("fullName", value)} placeholder="Nguyễn Văn A" readOnly/>
          <Field label="Mã nhân viên (Không sửa)" value={form.code} onChange={(value) => updateField("code", value)} placeholder="NV_ABCD" readOnly />
          <Field label="Email (Không sửa)" type="email" value={form.email} onChange={(value) => updateField("email", value)} placeholder="nv.a@company.com" readOnly/>
          <Field label="Số điện thoại" value={form.phone} onChange={(value) => updateField("phone", value)} placeholder="0123456789"/>
          <Field label="Vị trí" value={form.position} onChange={(value) => updateField("position", value)} placeholder="Phục vụ" />
          <Field label="Ngày tuyển dụng" type="date" value={form.hireDate} onChange={(value) => updateField("hireDate", value)} />
          <Field label="Lương theo giờ (VND/giờ)" type="number" value={String(form.baseSalary)} onChange={(value) => updateField("baseSalary", Number(value || 0))} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Trạng thái</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value as EmployeeFormState["status"])}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <option value="ACTIVE">Đang làm việc</option>
              <option value="INACTIVE">Tạm ngưng</option>
              <option value="RESIGNED">Đã nghỉ việc</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setForm(initialForm)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Làm mới
          </button>
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Đang lưu..." : "Đăng ký nhân viên"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  readOnly = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        step={1000}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-80 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
      />
    </label>
  );
}
