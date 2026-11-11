"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/modal";
import Pagination from "@/components/menu/Pagination";
import { InventoryItem, CreateInventoryItemInput } from "@/type/interface";
import { apiClient } from "@/lib/apiConfig";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

type StockFilter = "Tất cả" | "Sắp hết" | "Hết hàng" | "Còn hàng";
const itemsPerPage = 9;

export default function InventoryTable() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [newItem, setNewItem] = useState({ name: "", unit: "", purchaseUnit: "", conversionRate: "", quantity: "", minQuantity: "", costPrice: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const canAdjustInventory = user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    let isMounted = true;
    apiClient.inventory.getInventory()
      .then((inventoryResponse) => {
        if (!isMounted) return;
        if (inventoryResponse.success && inventoryResponse.data) {
          setInventory(inventoryResponse.data);
        } else {
          setError(inventoryResponse.error || "Không thể tải danh sách nguyên liệu.");
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Không thể tải danh sách nguyên liệu.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => ({
    itemCount: inventory.length,
    lowStockCount: inventory.filter((item) => item.quantity <= item.minQuantity).length,
    outOfStockCount: inventory.filter((item) => item.quantity <= 0).length,
    inventoryValue: inventory.reduce((total, item) => total + item.quantity * item.costPrice, 0),
  }), [inventory]);

  const selectStockFilter = (filter: StockFilter) => {
    setStockFilter(filter);
    setCurrentPage(1);
  };

  const filteredInventory = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    return inventory.filter((item) => {
      const matchesStockFilter = stockFilter === "Sắp hết"
        ? item.quantity > 0 && item.quantity <= item.minQuantity
        : stockFilter === "Hết hàng"
          ? item.quantity <= 0
        : stockFilter === "Còn hàng"
          ? item.quantity > item.minQuantity
          : true;
      const matchesQuery = !query || item.name.toLocaleLowerCase("vi").includes(query);
      return matchesStockFilter && matchesQuery;
    });
  }, [inventory, searchQuery, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / itemsPerPage));
  const visibleInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // const getConvertedStockQuantity = (item: InventoryItem, amount: number) => {
  //   if (!item.purchaseUnit || !item.conversionRate || item.conversionRate <= 0) {
  //     return amount;
  //   }
  //   console.log(`Converting ${amount} ${item.purchaseUnit} to ${item.unit} using conversion rate ${item.conversionRate}`);
  //   return Number((amount * item.conversionRate).toFixed(3));
  // };

  const handleCreateInventoryItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(newItem.quantity);
    const minQuantity = Number(newItem.minQuantity);
    const costPrice = Number(newItem.costPrice);
    const conversionRate = Number(newItem.conversionRate);
    const purchaseUnit = newItem.purchaseUnit.trim();

    if (!newItem.name.trim() || !newItem.unit.trim()) {
      setCreateError("Vui lòng nhập tên nguyên liệu và đơn vị.");
      return;
    }
    if (purchaseUnit && (!Number.isFinite(conversionRate) || conversionRate <= 0)) {
      setCreateError("Tỷ lệ quy đổi phải là số dương khi có đơn vị mua.");
      return;
    }
    if (![quantity, minQuantity, costPrice].every(Number.isFinite) || quantity < 0 || minQuantity < 0 || costPrice < 0) {
      setCreateError("Số lượng, tồn tối thiểu và đơn giá phải là số không âm.");
      return;
    }

    const normalizedPurchaseUnit = purchaseUnit || newItem.unit.trim();
    const normalizedConversionRate = purchaseUnit ? conversionRate : 1;

    const data: CreateInventoryItemInput = {
      name: newItem.name.trim(),
      unit: newItem.unit.trim(),
      purchaseUnit: normalizedPurchaseUnit,
      conversionRate: normalizedConversionRate,
      quantity,
      minQuantity,
      costPrice,
    };
    setIsCreating(true);
    setCreateError(null);
    const response = await apiClient.inventory.createInventoryItem(data);
    setIsCreating(false);
    if (!response.success || !response.data) {
      setCreateError(response.error || "Không thể tạo nguyên liệu.");
      return;
    }

    const createdItem = response.data;
    setInventory((items) => [createdItem, ...items]);
    setCurrentPage(1);
    setNewItem({ name: "", unit: "", purchaseUnit: "", conversionRate: "", quantity: "", minQuantity: "", costPrice: "" });
    setIsCreateOpen(false);
    setToastMessage(`Đã thêm nguyên liệu "${createdItem.name}".`);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteInventoryItem = async (item: InventoryItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nguyên liệu "${item.name}"?`)) return;

    setDeletingItemId(item.id);
    const response = await apiClient.inventory.deleteInventoryItem(item.id);
    setDeletingItemId(null);
    if (!response.success) {
      setToastMessage(response.error || "Không thể xóa nguyên liệu.");
      window.setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const remainingFilteredCount = filteredInventory.length - (filteredInventory.some((filteredItem) => filteredItem.id === item.id) ? 1 : 0);
    setInventory((items) => items.filter((inventoryItem) => inventoryItem.id !== item.id));
    setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(remainingFilteredCount / itemsPerPage))));
    setToastMessage(`Đã xóa nguyên liệu "${item.name}".`);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const renderStockStatus = (item: InventoryItem) => {
    const isOutOfStock = item.quantity <= 0;
    const isLowStock = !isOutOfStock && item.quantity <= item.minQuantity;
    const status = isOutOfStock ? "Hết hàng" : isLowStock ? "Sắp hết" : "Còn hàng";
    const statusClass = isOutOfStock
      ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
      : isLowStock
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    return (
      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
        {status}
      </span>
    );
  };

  const renderItemDetails = (item: InventoryItem) => (
    <>
      <span className="block font-semibold text-gray-800 text-theme-sm dark:text-white/90">{item.name}</span>
      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Cập nhật lần cuối: {new Date(item.updatedAt).toLocaleDateString("vi-VN")}</span>
    </>
  );

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-green-600">
          {toastMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tổng nguyên liệu</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{isLoading ? "—" : summary.itemCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nguyên liệu cần nhập</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">{isLoading ? "—" : summary.lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nguyên liệu hết hàng</p>
          <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">{isLoading ? "—" : summary.outOfStockCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Giá trị tồn kho</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{isLoading ? "—" : new Intl.NumberFormat("vi-VN").format(summary.inventoryValue)} <span className="text-sm font-medium">VNĐ</span></p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.04]">
          {(["Tất cả", "Sắp hết", "Hết hàng", "Còn hàng"] as StockFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => selectStockFilter(filter)}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition ${stockFilter === filter ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }}
              placeholder="Tìm theo tên nguyên liệu..."
              aria-label="Tìm nguyên liệu"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          {canAdjustInventory && (
            <button
              type="button"
              onClick={() => { setCreateError(null); setIsCreateOpen(true); }}
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Thêm nguyên liệu
            </button>
          )}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] sm:block">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                {["Nguyên liệu", "Tồn kho", "Tồn tối thiểu", "Đơn giá nhập", "Trạng thái", "Thao tác"].map((heading) => (
                  <TableCell key={heading} isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{heading}</TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading && <TableRow><TableCell colSpan={6} className="py-8 text-center text-gray-500">Đang tải danh sách nguyên liệu...</TableCell></TableRow>}
              {!isLoading && error && <TableRow><TableCell colSpan={6} className="py-8 text-center text-red-500">{error}</TableCell></TableRow>}
              {!isLoading && !error && visibleInventory.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-gray-500">Không tìm thấy nguyên liệu phù hợp.</TableCell></TableRow>}
              {!isLoading && !error && visibleInventory.map((item) => (
                <TableRow key={item.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                  <TableCell className="px-5 py-4 text-start">{renderItemDetails(item)}</TableCell>
                  <TableCell className={`px-5 py-4 text-sm font-semibold ${item.quantity <= item.minQuantity ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white/90"}`}>{item.quantity} {item.unit}</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{item.minQuantity} {item.unit}</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{new Intl.NumberFormat("vi-VN").format(item.costPrice)} VNĐ/{item.unit}</TableCell>
                  <TableCell className="px-5 py-4">{renderStockStatus(item)}</TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {canAdjustInventory && <>
                        <button type="button" onClick={() => { void handleDeleteInventoryItem(item); }} disabled={deletingItemId === item.id} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deletingItemId === item.id ? "Đang xóa..." : "Xóa"}</button>
                      </>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3 sm:hidden">
        {!isLoading && error && <p className="rounded-lg border border-red-200 bg-white p-5 text-center text-sm text-red-500 dark:border-red-500/20 dark:bg-white/[0.03]">{error}</p>}
        {isLoading && <p className="rounded-lg border border-gray-200 bg-white p-5 text-center text-sm text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">Đang tải danh sách nguyên liệu...</p>}
        {!isLoading && !error && visibleInventory.length === 0 && <p className="rounded-lg border border-gray-200 bg-white p-5 text-center text-sm text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">Không tìm thấy nguyên liệu phù hợp.</p>}
        {!isLoading && !error && visibleInventory.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">{renderItemDetails(item)}</div>
              {renderStockStatus(item)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm dark:border-white/[0.05]">
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Tồn kho</p><p className="mt-1 font-semibold text-gray-800 dark:text-white/90">{item.quantity} {item.unit}</p></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Tồn tối thiểu</p><p className="mt-1 font-medium text-gray-700 dark:text-gray-300">{item.minQuantity} {item.unit}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500 dark:text-gray-400">Đơn giá nhập</p><p className="mt-1 font-medium text-gray-700 dark:text-gray-300">{new Intl.NumberFormat("vi-VN").format(item.costPrice)} VNĐ/{item.unit}</p></div>
            </div>
            {canAdjustInventory && <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { void handleDeleteInventoryItem(item); }} disabled={deletingItemId === item.id} className="rounded-md bg-red-600 px-2 py-2 text-sm font-semibold text-white disabled:opacity-60">{deletingItemId === item.id ? "Đang xóa..." : "Xóa"}</button>
            </div>}
          </div>
        ))}
      </div>

      {!isLoading && !error && filteredInventory.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Hiển thị {visibleInventory.length} / {filteredInventory.length} nguyên liệu (Trang {currentPage} / {totalPages})</p>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="max-w-[520px] p-5 sm:p-7">
        <form onSubmit={handleCreateInventoryItem} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Thêm nguyên liệu</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Nhập thông tin nguyên liệu mới vào kho.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tên nguyên liệu
              <input required value={newItem.name} onChange={(event) => setNewItem((item) => ({ ...item, name: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Đơn vị
              <select required value={newItem.unit} onChange={(event) => setNewItem((item) => ({ ...item, unit: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="">Chọn đơn vị</option>
                {["kg", "g", "lít", "ml", "cái", "bó", "chai", "gói", "hộp", "thùng"].map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Đơn vị mua (nếu có)
              <select value={newItem.purchaseUnit} onChange={(event) => setNewItem((item) => ({ ...item, purchaseUnit: event.target.value, conversionRate: event.target.value ? item.conversionRate : "" }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                <option value="">Không dùng</option>
                {["kg", "g", "lít", "ml", "cái", "bó", "chai", "gói", "hộp", "thùng"].map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tỷ lệ quy đổi (1 mua = X kho)
              <input type="number" min="0.001" step="0.001" value={newItem.conversionRate} disabled={!newItem.purchaseUnit} onChange={(event) => setNewItem((item) => ({ ...item, conversionRate: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900" />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Số lượng ban đầu
              <input required type="number" min="0" step="0.001" value={newItem.quantity} onChange={(event) => setNewItem((item) => ({ ...item, quantity: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tồn tối thiểu
              <input required type="number" min="0" step="0.001" value={newItem.minQuantity} onChange={(event) => setNewItem((item) => ({ ...item, minQuantity: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
              Đơn giá nhập (VNĐ)
              <input required type="number" min="0" step="1" value={newItem.costPrice} onChange={(event) => setNewItem((item) => ({ ...item, costPrice: event.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </label>
          </div>
          {createError && <p role="alert" className="text-sm text-red-500">{createError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Hủy</button>
            <button type="submit" disabled={isCreating} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isCreating ? "Đang lưu..." : "Thêm nguyên liệu"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}