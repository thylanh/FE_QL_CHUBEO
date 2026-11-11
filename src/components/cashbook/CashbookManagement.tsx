"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiConfig";
import {
  CashbookCategory,
  CashbookEntry,
  CashbookListResponse,
  CashbookType,
  CreateCashbookEntryInput,
} from "@/type/interface";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

type TypeFilter = CashbookType | "";

const categoryLabels: Record<CashbookCategory, string> = {
  MISC_PURCHASE: "Mua đồ lặt vặt",
  SCRAP_SALE: "Bán ve chai",
  OTHER: "Khác",
};

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount)} ₫`;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
};

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const defaultCategory = (type: CashbookType): CashbookCategory =>
  type === "INCOME" ? "SCRAP_SALE" : "MISC_PURCHASE";

const fieldClassName =
  "mt-2 block h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-800 shadow-xs outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-white/[0.08] dark:bg-gray-900 dark:text-white/90 dark:focus:border-amber-500";

export default function CashbookManagement() {
  const { user } = useAuth();
  const canManageCashbook = user?.role === "ADMIN" || user?.role === "MANAGER";
  const now = new Date();
  const [from, setFrom] = useState(
    toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1))
  );
  const [to, setTo] = useState(toDateInputValue(now));
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [cashbook, setCashbook] = useState<CashbookListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<CashbookType>("EXPENSE");
  const [category, setCategory] = useState<CashbookCategory>("MISC_PURCHASE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!canManageCashbook) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (from && to && from > to) {
      setCashbook(null);
      setError("Ngày bắt đầu không được sau ngày kết thúc.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadCashbook = async () => {
      setCashbook(null);
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.cashbook.getEntries({
          type: typeFilter || undefined,
          from: from || undefined,
          to: to || undefined,
        });
        if (!isMounted) return;
        if (response.success && response.data) {
          setCashbook(response.data);
        } else {
          setError(response.error || "Không thể tải sổ thu chi.");
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Đã xảy ra lỗi khi tải sổ thu chi."
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadCashbook();
    return () => {
      isMounted = false;
    };
  }, [canManageCashbook, from, to, typeFilter, reloadKey]);

  const handleTypeChange = (nextType: CashbookType) => {
    setFormType(nextType);
    setCategory(defaultCategory(nextType));
  };

  const handleCreateEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!description.trim()) {
      setFormError("Vui lòng nhập nội dung khoản thu chi.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Số tiền phải lớn hơn 0.");
      return;
    }

    let occurredAtIso: string | undefined;
    if (occurredAt) {
      const parsedDate = new Date(occurredAt);
      if (Number.isNaN(parsedDate.getTime())) {
        setFormError("Thời điểm phát sinh không hợp lệ.");
        return;
      }
      occurredAtIso = parsedDate.toISOString();
    }

    const entry: CreateCashbookEntryInput = {
      type: formType,
      category,
      amount: parsedAmount,
      description: description.trim(),
      ...(occurredAtIso ? { occurredAt: occurredAtIso } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = await apiClient.cashbook.createEntry(entry);
      if (!response.success) {
        setFormError(response.error || "Không thể ghi khoản thu chi.");
        return;
      }

      setAmount("");
      setDescription("");
      setOccurredAt("");
      setNote("");
      setIsFormOpen(false);
      setReloadKey((key) => key + 1);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Đã xảy ra lỗi khi ghi khoản thu chi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = useMemo(() => {
    const entries = cashbook?.entries ?? [];
    const totalIncome = entries.reduce(
      (total, entry) => total + (entry.type === "INCOME" ? entry.amount : 0),
      0
    );
    const totalExpense = entries.reduce(
      (total, entry) => total + (entry.type === "EXPENSE" ? entry.amount : 0),
      0
    );
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [cashbook?.entries]);

  if (!canManageCashbook) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
      >
        Bạn không có quyền truy cập sổ thu chi.
      </div>
    );
  }

  const renderEntry = (entry: CashbookEntry) => (
    <TableRow key={entry.id} className="group transition-colors hover:bg-amber-50/40 dark:hover:bg-white/[0.025]">
      <TableCell className="whitespace-nowrap px-5 py-4">
        <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
          {formatDateTime(entry.occurredAt).split(",")[0]}
        </span>
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
          {formatDateTime(entry.occurredAt).split(",").slice(1).join(",").trim()}
        </span>
      </TableCell>
      <TableCell className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
          entry.type === "INCOME"
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20"
            : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20"
        }`}>
          <span aria-hidden="true">{entry.type === "INCOME" ? "↗" : "↘"}</span>
          {entry.type === "INCOME" ? "Khoản thu" : "Khoản chi"}
        </span>
      </TableCell>
      <TableCell className="px-5 py-4">
        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
          {categoryLabels[entry.category]}
        </span>
      </TableCell>
      <TableCell className="min-w-52 px-5 py-4">
        <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
          {entry.description}
        </span>
        {entry.note && (
          <span className="mt-1 block max-w-md truncate text-xs font-normal text-gray-500 dark:text-gray-400" title={entry.note}>
            {entry.note}
          </span>
        )}
      </TableCell>
      <TableCell className={`px-5 py-4 text-right text-sm font-semibold ${
        entry.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
      }`}>
        <span className="whitespace-nowrap">{entry.type === "INCOME" ? "+" : "−"}{formatCurrency(entry.amount)}</span>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        {[
          {
            label: "Tổng thu",
            value: totals.totalIncome,
            detail: "Tiền vào sổ trong kỳ",
            icon: "↗",
            colors: "border-emerald-200/70 from-white to-emerald-50/70 dark:border-emerald-500/15 dark:from-gray-900 dark:to-emerald-950/20",
            iconColors: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
            valueColor: "text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Tổng chi",
            value: totals.totalExpense,
            detail: "Tiền ra sổ trong kỳ",
            icon: "↘",
            colors: "border-rose-200/70 from-white to-rose-50/70 dark:border-rose-500/15 dark:from-gray-900 dark:to-rose-950/20",
            iconColors: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
            valueColor: "text-rose-700 dark:text-rose-300",
          },
          {
            label: "Số dư",
            value: totals.balance,
            detail: "Chênh lệch thu và chi",
            icon: "=",
            colors: "border-amber-200/70 from-white to-amber-50/70 dark:border-amber-500/15 dark:from-gray-900 dark:to-amber-950/20",
            iconColors: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
            valueColor: "text-gray-900 dark:text-white",
          },
        ].map((item) => (
          <article key={item.label} className={`group rounded-2xl border bg-gradient-to-br p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.colors}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${item.valueColor}`}>
                  {isLoading || error || item.value === undefined ? "—" : formatCurrency(item.value)}
                </p>
              </div>
              <span aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-bold shadow-xs ${item.iconColors}`}>
                {item.icon}
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{item.detail}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Bộ lọc giao dịch</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chọn khoảng thời gian và loại khoản cần xem.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-[1fr_1fr_1.2fr] lg:items-end">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Từ ngày
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Đến ngày
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClassName}
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Loại giao dịch</legend>
            <div className="flex h-11 rounded-xl bg-gray-100 p-1 dark:bg-white/[0.06]">
              {[
                { value: "", label: "Tất cả" },
                { value: "INCOME", label: "Khoản thu" },
                { value: "EXPENSE", label: "Khoản chi" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={typeFilter === option.value}
                  onClick={() => setTypeFilter(option.value as TypeFilter)}
                  className={`flex-1 rounded-lg px-2 text-xs font-semibold transition sm:text-sm ${
                    typeFilter === option.value
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 px-6 py-7 text-white shadow-lg shadow-orange-500/15 sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.08]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-40 h-56 w-56 rounded-full bg-white/[0.06]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <rect x="3" y="6" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M3 10h18M16 15h2M7 6V4.5A1.5 1.5 0 0 1 8.5 3h8A1.5 1.5 0 0 1 18 4.5V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Quản lý tài chính</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Sổ thu chi</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                Theo dõi các khoản thu ngoài đơn hàng và chi phí phát sinh của cửa hàng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setFormError(null); setIsFormOpen((open) => !open); }}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50 focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {isFormOpen ? "Đóng biểu mẫu" : "Ghi khoản mới"}
          </button>
        </div>
      </section>


      {isFormOpen && (
        <form onSubmit={handleCreateEntry} className="overflow-hidden rounded-2xl border border-amber-200/70 bg-white shadow-xs dark:border-amber-500/20 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50/70 px-5 py-4 dark:border-amber-500/10 dark:bg-amber-500/[0.06] sm:px-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Ghi khoản thu chi mới</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Điền thông tin để thêm giao dịch vào sổ.</p>
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Loại khoản
              <select
                value={formType}
                onChange={(event) => handleTypeChange(event.target.value as CashbookType)}
                className={fieldClassName}
              >
                <option value="EXPENSE">Khoản chi</option>
                <option value="INCOME">Khoản thu</option>
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Danh mục
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CashbookCategory)}
                className={fieldClassName}
              >
                {formType === "INCOME" && <option value="SCRAP_SALE">Bán ve chai</option>}
                {formType === "EXPENSE" && <option value="MISC_PURCHASE">Mua đồ lặt vặt</option>}
                <option value="OTHER">Khác</option>
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Số tiền (VNĐ)
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Nhập số tiền"
                className={fieldClassName}
              />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 xl:col-span-2">
              Nội dung
              <input
                type="text"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                placeholder="Ví dụ: Mua dụng cụ vệ sinh"
                className={fieldClassName}
              />
            </label>
            {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400 sm:col-span-2 xl:col-span-3">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:col-span-2 sm:flex-row sm:justify-end xl:col-span-3">
              <button
                type="button"
                onClick={() => { setIsFormOpen(false); setFormError(null); }}
                className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Đang lưu..." : "Lưu khoản thu chi"}
              </button>
            </div>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mt-0.5 h-5 w-5 shrink-0">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Lịch sử giao dịch</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? "Đang cập nhật dữ liệu..." : `${cashbook?.entries.length ?? 0} giao dịch trong kỳ đã chọn`}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:ring-white/[0.08]">
            <span className={`h-2 w-2 rounded-full ${isLoading ? "animate-pulse bg-amber-400" : error ? "bg-red-400" : "bg-emerald-500"}`} />
            {isLoading ? "Đang tải" : error ? "Có lỗi" : "Đã cập nhật"}
          </span>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 dark:bg-white/[0.025]">
              <TableRow className="border-b border-gray-100 dark:border-white/[0.05]">
                {["Thời điểm", "Loại", "Danh mục", "Nội dung", "Số tiền"].map((heading) => (
                  <TableCell key={heading} isHeader className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${heading === "Số tiền" ? "text-right" : "text-left"}`}>{heading}</TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading && <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Đang tải sổ thu chi...</TableCell></TableRow>}
              {!isLoading && !error && cashbook?.entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">₫</div>
                    <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-white/90">Chưa có giao dịch</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Thử đổi bộ lọc hoặc ghi khoản thu chi đầu tiên.</p>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && cashbook?.entries.map(renderEntry)}
            </TableBody>
          </Table>
        </div>
        {!isLoading && !error && (cashbook?.entries.length ?? 0) > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:px-6">
            Số liệu được tính theo bộ lọc ngày và loại giao dịch đang chọn.
          </div>
        )}
      </section>
    </div>
  );
}
