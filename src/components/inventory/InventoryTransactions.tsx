"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiConfig";
import {
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionItemSummary,
  InventoryTransactionType,
} from "@/type/interface";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

type TypeFilter = InventoryTransactionType | "";

const typeLabels: Record<InventoryTransactionType, string> = {
  IN: "Nhập kho",
  OUT: "Xuất kho",
  ADJUSTMENT: "Điều chỉnh",
};

const currency = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const quantityFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const formatCurrency = (value: number) => `${currency.format(value)} ₫`;

const dateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const inputClassName =
  "mt-2 block h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-800 shadow-xs outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/[0.08] dark:bg-gray-900 dark:text-white/90";

function getTransactionItemId(transaction: InventoryTransaction) {
  return transaction.inventoryItemId || transaction.itemId || transaction.inventoryItem?.id || "";
}

function getTransactionItemName(transaction: InventoryTransaction) {
  return transaction.inventoryItem?.name || transaction.itemName || "Nguyên liệu";
}

function getTransactionDate(transaction: InventoryTransaction) {
  const date = transaction.occurredAt || transaction.createdAt;
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function getNumber(record: unknown, keys: string[]) {
  if (!record || typeof record !== "object") return undefined;
  const value = record as Record<string, unknown>;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  }
  return getNumber(value.totals ?? value.summary, keys);
}

function getSummaryItems(record: unknown): InventoryTransactionItemSummary[] {
  if (!record || typeof record !== "object") return [];
  const value = record as Record<string, unknown>;
  const items = value.byItem ?? value.byIngredient ?? value.items ?? value.inventoryItems;
  if (Array.isArray(items)) return items as InventoryTransactionItemSummary[];
  return getSummaryItems(value.summary ?? value.totals);
}

function getSummaryItemId(item: InventoryTransactionItemSummary) {
  return item.inventoryItemId || item.itemId || item.id || item.inventoryItem?.id || "";
}

export default function InventoryTransactions() {
  const { user } = useAuth();
  const canManageInventory = user?.role === "ADMIN" || user?.role === "MANAGER";
  const now = new Date();
  const [from, setFrom] = useState(dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(dateInputValue(now));
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [type, setType] = useState<TypeFilter>("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [summary, setSummary] = useState<unknown>(null);
  const [historyTotals, setHistoryTotals] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionType, setActionType] = useState<"IN" | "OUT">("IN");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [inputUnit, setInputUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!canManageInventory) {
      setIsLoading(false);
      return;
    }
    if (from && to && from > to) {
      setTransactions([]);
      setSummary(null);
      setError("Ngày bắt đầu không được sau ngày kết thúc.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const filters = {
        from: from || undefined,
        to: to || undefined,
        inventoryItemId: inventoryItemId || undefined,
      };
      const [inventoryResponse, historyResponse, summaryResponse] = await Promise.all([
        apiClient.inventory.getInventory(),
        apiClient.inventory.getTransactions({ ...filters, type: type || undefined }),
        apiClient.inventory.getTransactionSummary(filters),
      ]);

      const errors = [
        inventoryResponse.success ? null : inventoryResponse.error || "Không thể tải tồn kho.",
        historyResponse.success ? null : historyResponse.error || "Không thể tải lịch sử kho.",
        summaryResponse.success ? null : summaryResponse.error || "Không thể tải thống kê nhập xuất.",
      ].filter((message): message is string => message !== null);
      if (errors.length) {
        setError(errors.join(" "));
        setTransactions([]);
        setHistoryTotals(null);
        setSummary(null);
        return;
      }

      if (
        !Array.isArray(inventoryResponse.data) ||
        !historyResponse.data ||
        !Array.isArray(historyResponse.data.transactions) ||
        !summaryResponse.data
      ) {
        setError("Dữ liệu kho từ API không đúng định dạng.");
        setTransactions([]);
        setHistoryTotals(null);
        setSummary(null);
        return;
      }
      setInventory(inventoryResponse.data);
      setTransactions(historyResponse.data.transactions);
      setHistoryTotals(historyResponse.data.totals ?? historyResponse.data.summary ?? historyResponse.data);
      setSummary(summaryResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Đã xảy ra lỗi khi tải dữ liệu kho.");
      setTransactions([]);
      setHistoryTotals(null);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [canManageInventory, from, to, inventoryItemId, type]);

  useEffect(() => {
    void loadData();
  }, [loadData, reloadKey]);

  const selectedItem = inventory.find((item) => item.id === selectedItemId);
  const filteredStock = useMemo(
    () => inventory.filter((item) => !inventoryItemId || item.id === inventoryItemId),
    [inventory, inventoryItemId]
  );
  const summaryItems = getSummaryItems(summary);
  const totalIn = getNumber(summary, ["stockInCount", "totalIn", "quantityIn"])
    ?? getNumber(historyTotals, ["stockInCount", "totalIn", "quantityIn"])
    ?? transactions.filter((entry) => entry.type === "IN").reduce((sum, entry) => sum + entry.quantity, 0);
  const totalOut = getNumber(summary, ["stockOutCount", "totalOut", "quantityOut"])
    ?? getNumber(historyTotals, ["stockOutCount", "totalOut", "quantityOut"])
    ?? transactions.filter((entry) => entry.type === "OUT").reduce((sum, entry) => sum + entry.quantity, 0);
  const importCost = getNumber(summary, ["totalImportCost", "importCost", "totalCost"])
    ?? getNumber(historyTotals, ["totalImportCost", "importCost", "totalCost"])
    ?? transactions.reduce((sum, entry) => sum + (entry.type === "IN" ? entry.totalCost ?? 0 : 0), 0);

  const openActionForm = (selectedAction: "IN" | "OUT", item?: InventoryItem) => {
    const defaultItem = item ?? inventory[0];
    setActionType(selectedAction);
    setSelectedItemId(defaultItem?.id ?? "");
    setInputUnit(defaultItem?.purchaseUnit || defaultItem?.unit || "");
    setQuantity("");
    setUnitCost("");
    setTotalCost("");
    setReferenceId("");
    setNote("");
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleItemChange = (id: string) => {
    const item = inventory.find((candidate) => candidate.id === id);
    setSelectedItemId(id);
    setInputUnit(item?.purchaseUnit || item?.unit || "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    const parsedUnitCost = unitCost === "" ? undefined : Number(unitCost);
    const parsedTotalCost = totalCost === "" ? undefined : Number(totalCost);

    if (!selectedItem) {
      setFormError("Vui lòng chọn nguyên liệu.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError("Số lượng phải lớn hơn 0.");
      return;
    }
    if (actionType === "OUT" && parsedQuantity > selectedItem.quantity) {
      setFormError("Số lượng xuất không được lớn hơn tồn kho hiện tại.");
      return;
    }
    if (
      actionType === "IN" &&
      ((parsedUnitCost !== undefined && (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0)) ||
        (parsedTotalCost !== undefined && (!Number.isFinite(parsedTotalCost) || parsedTotalCost < 0)))
    ) {
      setFormError("Chi phí nhập phải là số không âm.");
      return;
    }
    if (!inputUnit.trim()) {
      setFormError("Vui lòng nhập đơn vị giao dịch.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = actionType === "IN"
        ? await apiClient.inventory.stockIn(selectedItem.id, {
            quantity: parsedQuantity,
            inputUnit: inputUnit.trim(),
            ...(parsedUnitCost !== undefined ? { unitCost: parsedUnitCost } : {}),
            ...(parsedTotalCost !== undefined ? { totalCost: parsedTotalCost } : {}),
            ...(referenceId.trim() ? { referenceId: referenceId.trim() } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
          })
        : await apiClient.inventory.stockOut(selectedItem.id, {
            quantity: parsedQuantity,
            inputUnit: inputUnit.trim(),
            ...(referenceId.trim() ? { referenceId: referenceId.trim() } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
          });

      if (!response.success) {
        setFormError(response.error || `Không thể ${actionType === "IN" ? "nhập" : "xuất"} kho.`);
        return;
      }
      setIsFormOpen(false);
      setReloadKey((key) => key + 1);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Đã xảy ra lỗi khi cập nhật kho.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canManageInventory) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        Bạn không có quyền truy cập lịch sử xuất nhập kho.
      </div>
    );
  }

  const metrics = [
    { label: "Tổng số đơn nhập", value: quantityFormat.format(totalIn), detail: "Trong khoảng thời gian đã chọn", icon: "↓", color: "emerald" },
    { label: "Tổng số đơn xuất", value: quantityFormat.format(totalOut), detail: "Trong khoảng thời gian đã chọn", icon: "↑", color: "amber" },
    { label: "Chi phí nhập", value: formatCurrency(importCost), detail: "Tổng giá trị hàng nhập", icon: "₫", color: "blue" },
  ];
  const metricColors: Record<string, string> = {
    emerald: "border-emerald-200/70 from-white to-emerald-50/70 dark:border-emerald-500/15 dark:from-gray-900 dark:to-emerald-950/20",
    amber: "border-amber-200/70 from-white to-amber-50/70 dark:border-amber-500/15 dark:from-gray-900 dark:to-amber-950/20",
    blue: "border-blue-200/70 from-white to-blue-50/70 dark:border-blue-500/15 dark:from-gray-900 dark:to-blue-950/20",
    violet: "border-violet-200/70 from-white to-violet-50/70 dark:border-violet-500/15 dark:from-gray-900 dark:to-violet-950/20",
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold dark:border-red-400/30">Thử tải lại</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className={`rounded-2xl border bg-gradient-to-br p-5 shadow-xs ${metricColors[metric.color]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{isLoading || error ? "—" : metric.value}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-lg font-bold text-emerald-700 shadow-xs dark:bg-white/[0.06] dark:text-emerald-300">{metric.icon}</span>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{metric.detail}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Bộ lọc giao dịch</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ngày kết thúc được tính bao gồm cả ngày đã chọn.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Từ ngày
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClassName} />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Đến ngày
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={inputClassName} />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nguyên liệu
            <select value={inventoryItemId} onChange={(event) => setInventoryItemId(event.target.value)} className={inputClassName}>
              <option value="">Tất cả nguyên liệu</option>
              {inventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Loại giao dịch
            <select value={type} onChange={(event) => setType(event.target.value as TypeFilter)} className={inputClassName}>
              <option value="">Tất cả giao dịch</option>
              <option value="IN">Nhập kho</option>
              <option value="OUT">Xuất kho</option>
              <option value="ADJUSTMENT">Điều chỉnh</option>
            </select>
          </label>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.07]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-sm font-medium text-emerald-100">Quản lý nguyên liệu</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Xuất nhập tồn kho</h1>
            <p className="mt-2 text-sm text-emerald-50/80">Theo dõi biến động kho và ghi nhận các lần nhập, xuất hàng.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openActionForm("IN")} disabled={!inventory.length} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50">
              <span aria-hidden="true" className="text-lg">↓</span> Nhập kho
            </button>
            <button type="button" onClick={() => openActionForm("OUT")} disabled={!inventory.length} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50">
              <span aria-hidden="true" className="text-lg">↑</span> Xuất kho
            </button>
          </div>
        </div>
      </section>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xs dark:border-emerald-500/20 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 dark:border-emerald-500/10 dark:bg-emerald-500/[0.06] sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">{actionType === "IN" ? "Ghi nhận nhập kho" : "Ghi nhận xuất kho"}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tồn kho được cập nhật và lịch sử giao dịch được lưu đồng thời.</p>
            </div>
            <button type="button" onClick={() => setIsFormOpen(false)} aria-label="Đóng biểu mẫu" className="rounded-lg px-3 py-2 text-gray-500 hover:bg-white dark:hover:bg-white/[0.06]">✕</button>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nguyên liệu
              <select required value={selectedItemId} onChange={(event) => handleItemChange(event.target.value)} className={inputClassName}>
                {inventory.map((item) => <option key={item.id} value={item.id}>{item.name} — tồn {quantityFormat.format(item.quantity)} {item.unit}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Số lượng
              <input required type="number" min="0.001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Nhập số lượng" className={inputClassName} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Đơn vị nhập / xuất
              <input required readOnly type="text" value={inputUnit} placeholder={selectedItem?.purchaseUnit || selectedItem?.unit || "Đơn vị"} className={`${inputClassName} cursor-not-allowed bg-gray-50 dark:bg-gray-800`} />
              {selectedItem?.purchaseUnit && selectedItem.purchaseUnit !== selectedItem.unit && (
                <span className="mt-1 block text-xs text-gray-400">Đơn vị tồn kho: {selectedItem.unit}</span>
              )}
            </label>
            {actionType === "IN" && (
              <>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Đơn giá nhập (VNĐ)
                  <input type="number" min="0" step="any" value={unitCost} onChange={(event) => { setUnitCost(event.target.value); if (event.target.value) setTotalCost(""); }} placeholder="nhập đơn giá hoặc tổng tiền" className={inputClassName} />
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tổng tiền nhập (VNĐ)
                  <input type="number" min="0" step="any" value={totalCost} onChange={(event) => { setTotalCost(event.target.value); if (event.target.value) setUnitCost(""); }} placeholder="nhập đơn giá hoặc tổng tiền" className={inputClassName} />
                </label>
              </>
            )}
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mã tham chiếu <span className="font-normal text-gray-400">(không bắt buộc)</span>
              <input type="text" value={referenceId} onChange={(event) => setReferenceId(event.target.value)} placeholder="Mã hóa đơn / phiếu kho" className={inputClassName} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2 lg:col-span-3">Ghi chú <span className="font-normal text-gray-400">(không bắt buộc)</span>
              <input type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder={actionType === "IN" ? "Ví dụ: Nhập từ nhà cung cấp" : "Lý do xuất kho"} className={inputClassName} />
            </label>
            {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400 sm:col-span-2 lg:col-span-3">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-3">
              <button type="button" onClick={() => setIsFormOpen(false)} className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 dark:border-white/10 dark:text-gray-300">Hủy</button>
              <button type="submit" disabled={isSubmitting} className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? "Đang lưu..." : actionType === "IN" ? "Xác nhận nhập kho" : "Xác nhận xuất kho"}
              </button>
            </div>
          </div>
        </form>
      )}

      {summaryItems.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Tổng hợp theo nguyên liệu</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Số liệu trong khoảng thời gian đã chọn.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/80 dark:bg-white/[0.025]">
                <TableRow>
                  {["Nguyên liệu", "Tổng nhập", "Tổng xuất", "Chi phí nhập"].map((heading) => (
                    <TableCell key={heading} isHeader className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${heading === "Nguyên liệu" ? "text-left" : "text-right"}`}>{heading}</TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {summaryItems.map((item) => {
                  const itemId = getSummaryItemId(item);
                  const stockItem = inventory.find((candidate) => candidate.id === itemId);
                  const name = item.itemName || item.name || item.inventoryItem?.name || stockItem?.name || "Nguyên liệu";
                  const inQty = item.stockInQuantity ?? item.totalIn ?? 0;
                  const outQty = item.stockOutQuantity ?? item.totalOut ?? 0;
                  const cost = item.totalImportCost ?? item.importCost ?? item.totalCost ?? 0;
                  return (
                    <TableRow key={itemId || name} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                      <TableCell className="px-5 py-3.5">
                        <span className="block font-semibold text-gray-800 dark:text-white/90">{name}</span>
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">Tồn hiện tại: {quantityFormat.format(stockItem?.quantity ?? 0)} {item.unit || item.inventoryItem?.unit || stockItem?.unit}</span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{quantityFormat.format(inQty)} {item.unit || item.inventoryItem?.unit || stockItem?.unit}</TableCell>
                      <TableCell className="px-5 py-3.5 text-right tabular-nums text-amber-700 dark:text-amber-300">{quantityFormat.format(outQty)} {item.unit || item.inventoryItem?.unit || stockItem?.unit}</TableCell>
                      <TableCell className="px-5 py-3.5 text-right font-semibold tabular-nums text-gray-800 dark:text-white/90">{formatCurrency(cost)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Lịch sử giao dịch kho</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{isLoading ? "Đang tải giao dịch..." : `${transactions.length} giao dịch`}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:ring-white/[0.08]">
            <span className={`h-2 w-2 rounded-full ${isLoading ? "animate-pulse bg-amber-400" : error ? "bg-red-400" : "bg-emerald-500"}`} />
            {isLoading ? "Đang tải" : error ? "Có lỗi" : "Đã cập nhật"}
          </span>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 dark:bg-white/[0.025]">
              <TableRow>
                {["Thời điểm", "Nguyên liệu", "Loại", "Số lượng", "Chi phí nhập", "Tham chiếu / ghi chú"].map((heading) => (
                  <TableCell key={heading} isHeader className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${heading === "Số lượng" || heading === "Chi phí nhập" ? "text-right" : "text-left"}`}>{heading}</TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading && <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-gray-500">Đang tải lịch sử kho...</TableCell></TableRow>}
              {!isLoading && !error && transactions.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-gray-500">Không có giao dịch trong khoảng thời gian đã chọn.</TableCell></TableRow>}
              {!isLoading && !error && transactions.map((transaction) => {
                const item = inventory.find((candidate) => candidate.id === getTransactionItemId(transaction));
                const displayUnit = transaction.unit || transaction.inputUnit || item?.unit || "";
                return (
                  <TableRow key={transaction.id} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                    <TableCell className="whitespace-nowrap px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{getTransactionDate(transaction)}</TableCell>
                    <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">{getTransactionItemName(transaction)}</TableCell>
                    <TableCell className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                        transaction.type === "IN"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : transaction.type === "OUT"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            : "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                      }`}>{typeLabels[transaction.type]}</span>
                    </TableCell>
                    <TableCell className={`px-5 py-4 text-right text-sm font-semibold tabular-nums ${transaction.type === "IN" ? "text-emerald-700 dark:text-emerald-300" : transaction.type === "OUT" ? "text-amber-700 dark:text-amber-300" : "text-gray-700 dark:text-gray-300"}`}>
                      {transaction.type === "IN" ? "+" : transaction.type === "OUT" ? "−" : ""}{quantityFormat.format(transaction.quantity)} {displayUnit}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">{transaction.type === "IN" && transaction.totalCost != null ? formatCurrency(transaction.totalCost) : "—"}</TableCell>
                    <TableCell className="max-w-64 px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {transaction.referenceId && <span className="block font-medium text-gray-700 dark:text-gray-200">{transaction.referenceId}</span>}
                      {transaction.note || (!transaction.referenceId ? "—" : "")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
