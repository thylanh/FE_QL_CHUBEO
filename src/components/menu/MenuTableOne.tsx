"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import Badge from "../ui/badge/Badge";
import Image from "next/image";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import FileInput from "../form/input/FileInput";
import Pagination from "./Pagination";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { apiClient } from "@/lib/apiConfig";
import { InventoryItem, MenuIngredient, MenuItem } from "@/type/interface";

const DEFAULT_DISH_IMAGE =
  "https://res.cloudinary.com/dvh3kt3uv/image/upload/v1777954448/SHE07687_eqjuys.png";
const FALLBACK_LOCAL_IMAGE = "/images/product/product-01.jpg";

export default function BasicTableOne() {
  const { isOpen, openModal, closeModal } = useModal();

  const normalizeMenuIngredients = (item: {
    menu_item_ingredients?: MenuIngredient[];
    ingredients?: MenuIngredient[] | Record<string, number>;
  }): MenuIngredient[] => {
    if (item.menu_item_ingredients?.length) return item.menu_item_ingredients;
    if (Array.isArray(item.ingredients)) return item.ingredients;
    return Object.entries(item.ingredients || {}).map(([ingredientId, quantity]) => ({
      ingredient_id: ingredientId,
      amount: Number(quantity),
    }));
  };

  // Form State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [dishName, setDishName] = useState("");
  const [dishCategory, setDishCategory] = useState("Món chính");
  const [dishDescription, setDishDescription] = useState("");
  const [price, setPrice] = useState("");
  const [dishActive, setDishActive] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, number>>({});
  const [inventoryLoading, setInventoryLoading] = useState(true);

  // List & Filter State
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 9;

  // Load Menu from API / storage
  useEffect(() => {
    let isMounted = true;
    Promise.all([apiClient.menu.getMenu(), apiClient.inventory.getInventory()]).then(([response, inventoryResponse]) => {
      if (!isMounted) return;
      if (response.success && response.data) {
        setMenu(
          response.data.map((item) => ({
            ...item,
            id: String(item.id),
            active: item.active !== false,
            menu_item_ingredients: normalizeMenuIngredients(item),
          }))
        );
      } else {
        setError(response.error || "Không thể tải thực đơn.");
      }
      if (inventoryResponse.success && inventoryResponse.data) {
        setInventory(inventoryResponse.data);
      }
      setInventoryLoading(false);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/\D/g, "");
    setPrice(digitsOnly ? new Intl.NumberFormat("vi-VN").format(Number(digitsOnly)) : "");
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setFormError("Vui lòng chọn tệp hình ảnh.");
        event.target.value = "";
        return;
      }
      setSelectedImageFile(file);
      setFormError(null);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Mở modal thêm món mới
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setDishName("");
    setDishCategory("Món chính");
    setDishDescription("");
    setPrice("");
    setDishActive(true);
    setImagePreview(null);
    setSelectedImageFile(null);
    setSelectedIngredients({});
    setFormError(null);
    openModal();
  };

  // Mở modal chỉnh sửa món
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setDishName(item.name);
    setDishCategory(item.category || "Món chính");
    setDishDescription(item.description || "");
    setPrice(new Intl.NumberFormat("vi-VN").format(item.price));
    setImagePreview(item.image || null);
    setSelectedImageFile(null);
    setSelectedIngredients(Object.fromEntries(
      item.menu_item_ingredients.map((ingredient) => [ingredient.ingredient_id, ingredient.amount])
    ));
    setFormError(null);
    openModal();
  };

  // Lưu món (Thêm mới hoặc Cập nhật)
  const handleSaveDish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dishName.trim()) {
      setFormError("Vui lòng nhập tên món ăn.");
      return;
    }
    const rawNumeric = Number(price.replace(/\D/g, ""));
    if (isNaN(rawNumeric) || rawNumeric <= 0) {
      setFormError("Vui lòng nhập giá bán hợp lệ lớn hơn 0 VNĐ.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    let imageUrl = imagePreview || editingItem?.image || DEFAULT_DISH_IMAGE;
    if (selectedImageFile) {
      try {
        imageUrl = await uploadImageToCloudinary(selectedImageFile);
      } catch (uploadError) {
        setFormError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh lên Cloudinary.");
        setIsSubmitting(false);
        return;
      }
    }
    const menuItemIngredients: MenuIngredient[] = Object.entries(selectedIngredients)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([ingredient_id, amount]) => ({ ingredient_id, amount: Number(amount) }));

    if (editingItem) {
      // Chỉnh sửa món đã có
      const updated = await apiClient.menu.updateMenuItem(editingItem.id, {
        name: dishName.trim(),
        category: dishCategory,
        description: dishDescription.trim(),
        price: rawNumeric,
        image: imageUrl,
        active: dishActive,
        ingredients: menuItemIngredients,
      });
      if (updated.success) {
        setMenu((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  name: dishName.trim(),
                  category: dishCategory,
                  description: dishDescription.trim(),
                  price: rawNumeric,
                  image: imageUrl,
                  active: dishActive,
                  menu_item_ingredients: menuItemIngredients,
                }
              : item
          )
        );
        showToast(`Đã cập nhật món "${dishName.trim()}" thành công!`);
        closeModal();
      } else {
        setFormError(updated.error || "Không thể cập nhật món ăn.");
      }
    } else {
      // Tạo món mới
      const newDish = await apiClient.menu.createMenuItem({
        name: dishName.trim(),
        category: dishCategory,
        description: dishDescription.trim(),
        price: rawNumeric,
        image: imageUrl,
        active: dishActive,
        ingredients: menuItemIngredients,
      });

      if (newDish.success && newDish.data) {
        const newItem: MenuItem = {
          id: String(newDish.data.id),
          name: newDish.data.name,
          category: newDish.data.category || dishCategory,
          description: newDish.data.description || "",
          price: newDish.data.price,
          image: newDish.data.image || imageUrl,
          created_at: newDish.data.created_at || new Date().toISOString(),
          active: newDish.data.active !== false,
          menu_item_ingredients: normalizeMenuIngredients(newDish.data),
        };

        setMenu((prev) => [newItem, ...prev]);
        showToast(`Đã thêm món "${dishName.trim()}" vào thực đơn!`);
        closeModal();
      } else {
        setFormError(newDish.error || "Không thể tạo món ăn.");
      }
    }
    setIsSubmitting(false);
  };

  // Xóa món khỏi thực đơn
  const handleDeleteDish = async (item: MenuItem) => {
    const isConfirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa món "${item.name}" khỏi thực đơn?`
    );
    if (!isConfirmed) return;
    const result = await apiClient.menu.deleteMenuItem(item.id);
    if (!result.success) {
      showToast(result.error || "Không thể xóa món ăn.");
      return;
    }
    setMenu((prev) => prev.filter((menuItem) => menuItem.id !== item.id));
    const query = searchQuery.trim().toLowerCase();
    const remainingFilteredCount = menu.filter((menuItem) => {
      if (menuItem.id === item.id) return false;
      const matchCategory = categoryFilter === "Tất cả" || menuItem.category === categoryFilter;
      const matchQuery =
        !query ||
        menuItem.name.toLowerCase().includes(query) ||
        (menuItem.description || "").toLowerCase().includes(query) ||
        (menuItem.category || "").toLowerCase().includes(query);
      return matchCategory && matchQuery;
    }).length;
    const remainingTotalPages = Math.max(1, Math.ceil(remainingFilteredCount / itemsPerPage));
    setCurrentPage((page) => Math.min(page, remainingTotalPages));
    showToast(`Đã xóa món "${item.name}" khỏi thực đơn.`);
  };

  // Lọc và Tìm kiếm
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchCategory =
        categoryFilter === "Tất cả" || item.category === categoryFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.description || "").toLowerCase().includes(query) ||
        (item.category || "").toLowerCase().includes(query);
      return matchCategory && matchQuery;
    });
  }, [menu, categoryFilter, searchQuery]);
  
  const totalPages = Math.max(1, Math.ceil(filteredMenu.length / itemsPerPage));
  const visibleTableData = useMemo(() => {
    return filteredMenu.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredMenu, currentPage]);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl dark:bg-amber-500 dark:text-gray-950 transition-all animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action bar: Search, Filter, and Create Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-theme-sm font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 transition-all hover:scale-[1.02]"
          >
            <span>➕</span> Tạo Món Mới
          </button>

          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/[0.05] dark:bg-white/[0.03]">
            {["Tất cả", "Món chính", "Món thêm", "Đồ uống", "Combo"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên món..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.08] dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] sm:block">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[900px]">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Tên món
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Mô tả món
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Trạng thái món
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Giá bán
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                      Đang tải thực đơn...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && error && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && visibleTableData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                      Không tìm thấy món ăn nào phù hợp.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  !error &&
                  visibleTableData.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 overflow-hidden rounded-xl shrink-0 border border-gray-100 dark:border-gray-800">
                            <Image
                              width={44}
                              height={44}
                              src={order.image || DEFAULT_DISH_IMAGE}
                              alt={order.name}
                              className="h-11 w-11 object-cover"
                              unoptimized
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.srcset = "";
                                target.src = FALLBACK_LOCAL_IMAGE;
                              }}
                            />
                          </div>
                          <div>
                            <span className="block font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                              {order.name}
                            </span>
                            <span className="inline-block mt-0.5 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700 text-[11px] dark:bg-amber-500/10 dark:text-amber-400">
                              {order.category || "Món chính"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 max-w-[280px] truncate">
                        {order.description || "Chưa có mô tả"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <Badge
                            size="sm"
                            color={order.active ? "success" : "error"}
                          >
                            {order.active ? "Còn món" : "Hết món"}
                          </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400 text-theme-sm">
                        {new Intl.NumberFormat("vi-VN").format(order.price)} VNĐ
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(order)}
                            title={`Sửa món ${order.name}`}
                            aria-label={`Sửa món ${order.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDish(order)}
                            title={`Xóa món ${order.name}`}
                            aria-label={`Xóa món ${order.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <TrashBinIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 sm:hidden">
        {!isLoading && !error && visibleTableData.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
            Không tìm thấy món ăn nào phù hợp.
          </div>
        )}
        {!isLoading &&
          !error &&
          visibleTableData.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] shadow-sm"
            >
              <div className="flex items-start gap-3">
                <Image
                  width={48}
                  height={48}
                  src={order.image || DEFAULT_DISH_IMAGE}
                  alt={order.name}
                  className="h-12 w-12 shrink-0 rounded-xl object-cover border border-gray-100 dark:border-gray-800"
                  unoptimized
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.srcset = "";
                    target.src = FALLBACK_LOCAL_IMAGE;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                    {order.name}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {order.category || "Món chính"}
                  </p>
                  <p className="mt-1 text-gray-500 text-xs dark:text-gray-400 line-clamp-2">
                    {order.description || "Chưa có mô tả"}
                  </p>
                </div>
                  <Badge size="sm" color={order.active ? "success" : "error"}>
                    {order.active ? "Còn món" : "Hết món"}
                  </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-white/[0.05]">
                <span className="font-bold text-amber-600 text-sm dark:text-amber-400">
                  {new Intl.NumberFormat("vi-VN").format(order.price)} VNĐ
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(order)}
                    title={`Sửa món ${order.name}`}
                    aria-label={`Sửa món ${order.name}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDish(order)}
                    title={`Xóa món ${order.name}`}
                    aria-label={`Xóa món ${order.name}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <TrashBinIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Pagination & Count */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.03] sm:flex-row">
        <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400 sm:text-left">
          Hiển thị {visibleTableData.length} / {filteredMenu.length} món (Trang {currentPage} / {totalPages})
        </p>
        <div className="w-full overflow-x-auto sm:w-auto">
          <div className="flex min-w-max justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      {/* Modal: Tạo Món Mới / Sửa Món */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="mx-4 max-h-[90vh] max-w-[584px] overflow-y-auto p-5 sm:mx-6 lg:p-8"
      >
        <form onSubmit={handleSaveDish}>
          <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white/90">
                {editingItem ? "Chỉnh sửa món ăn" : "Thêm món mới vào thực đơn"}
              </h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {editingItem
                  ? `Cập nhật thông tin cho món: ${editingItem.name}`
                  : "Điền thông tin món ăn mới để cập nhật vào hệ thống"}
              </p>
            </div>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Tên món <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="Nhập tên món (ví dụ: Bún đậu đặc biệt)"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Loại món <span className="text-red-500">*</span></Label>
              <select
                value={dishCategory}
                onChange={(e) => setDishCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="Món chính">Món chính</option>
                <option value="Món thêm">Món thêm</option>
                <option value="Đồ uống">Đồ uống</option>
                <option value="Combo">Combo</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <Label>Hình ảnh món</Label>
              <FileInput onChange={handleImageChange} />
              {imagePreview && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                  <Image
                    src={imagePreview}
                    alt="Ảnh món đã chọn"
                    width={70}
                    height={70}
                    className="h-14 w-14 rounded-lg object-cover"
                    unoptimized
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Ảnh đã chọn
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setSelectedImageFile(null);
                      }}
                      className="mt-1 text-xs text-red-500 hover:underline"
                    >
                      Xóa ảnh (dùng ảnh mặc định)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label>Mô tả món</Label>
              <textarea
                placeholder="Nhập mô tả món (nguyên liệu, cách chế biến...)"
                rows={3}
                value={dishDescription}
                onChange={(e) => setDishDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <Label>Giá bán (VNĐ) <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                name="price"
                value={price}
                placeholder="69.000"
                onChange={handlePriceChange}
                hint="Nhập số tiền, ví dụ: 69.000"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <Label>Nguyên liệu và định lượng</Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">Cho 1 phần món</span>
              </div>
              {inventoryLoading ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Đang tải danh sách nguyên liệu...
                </p>
              ) : inventory.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Chưa có nguyên liệu trong kho.
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.keys(selectedIngredients).length > 0 && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2.5 dark:bg-amber-500/10">
                      <p className="mb-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Đang sử dụng {Object.keys(selectedIngredients).length} nguyên liệu
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(selectedIngredients).map(([ingredientId, quantity]) => {
                          const ingredient = inventory.find((item) => item.id === ingredientId);
                          return (
                            <span key={ingredientId} className="text-xs text-amber-700 dark:text-amber-200">
                              {ingredient?.name || ingredientId}: <strong>{quantity} {ingredient?.unit || ""}</strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  {inventory.map((ingredient) => {
                    const isSelected = Object.prototype.hasOwnProperty.call(selectedIngredients, ingredient.id);
                    return (
                      <div key={ingredient.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => {
                            setSelectedIngredients((current) => {
                              const next = { ...current };
                              if (event.target.checked) next[ingredient.id] = 1;
                              else delete next[ingredient.id];
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="min-w-0 flex-1 text-sm text-gray-700 dark:text-gray-300">
                          {ingredient.name}
                          <span className="ml-1 text-xs text-gray-400">(tồn {ingredient.quantity} {ingredient.unit})</span>
                        </span>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={selectedIngredients[ingredient.id]}
                              onChange={(event) => {
                                const quantity = Number(event.target.value);
                                setSelectedIngredients((current) => ({ ...current, [ingredient.id]: quantity }));
                              }}
                              className="h-9 w-20 rounded-lg border border-gray-300 bg-transparent px-2 text-right text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                              aria-label={`Định lượng ${ingredient.name}`}
                            />
                            <span className="w-10 text-xs text-gray-500">{ingredient.unit}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex w-full items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-theme-xs transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang lưu...
                </>
              ) : editingItem ? (
                "Cập nhật món"
              ) : (
                "Lưu món mới"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
