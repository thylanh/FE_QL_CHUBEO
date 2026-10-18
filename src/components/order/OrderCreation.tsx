"use client";
import { apiClient } from "@/lib/apiConfig";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CreateOrderInput, InventoryItem, MenuIngredient, MenuItem } from "@/type/interface";

type Category = "Món chính" | "Món thêm" | "Đồ uống" | "Combo";
type CartItem = MenuItem & { quantity: number; adjustedIngredients: MenuIngredient[] };
const tables = ["Bàn 01 + 02", "Bàn 03 + 04", "Bàn 05 + 06", "Bàn 07", "Bàn 08", "Bàn 09", "Bàn 10", "Bàn 11", "Bàn 12", "Bàn 13", "Bàn 14"];
const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
function SearchIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>;
}
function PlusIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>;
}

function OrderCreation() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("Món chính");
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<CreateOrderInput["orderType"]>("Tại quán");
  const [selectedTable, setSelectedTable] = useState(tables[0]);
  const [guestCount, setGuestCount] = useState(1);
  const [orderNote, setOrderNote] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadMenu = async () => {
      try {
        const [menuResult, inventoryResult] = await Promise.allSettled([
          apiClient.menu.getMenu(),
          apiClient.inventory.getInventory(),
        ]);
        if (!isMounted) return;
        if (menuResult.status === "rejected") {
          throw menuResult.reason;
        }
        const res = menuResult.value;
        if (!res.success) {
          setMenuError(res.error || "Không thể tải thực đơn.");
          return;
        }
        if (inventoryResult.status === "fulfilled" && inventoryResult.value.success && inventoryResult.value.data) {
          setInventoryItems(inventoryResult.value.data);
        } else {
          setInventoryError(
            inventoryResult.status === "rejected"
              ? inventoryResult.reason instanceof Error
                ? inventoryResult.reason.message
                : "Không thể tải tên nguyên liệu trong kho."
              : inventoryResult.value.error || "Không thể tải tên nguyên liệu trong kho."
          );
        }
        setMenuItems(
          (res.data || []).map((dish, idx) => {
            const menuIngredients = dish.menu_item_ingredients?.length
              ? dish.menu_item_ingredients
              : Array.isArray(dish.ingredients)
                ? dish.ingredients
                : [];

            return {
              id: String(dish.id ?? idx + 1),
              name: dish.name,
              category: (dish.category as Category) || "Món chính",
              price: dish.price,
              created_at: dish.created_at || new Date().toISOString(),
              description: dish.description || "",
              image: dish.image,
              active: dish.active !== false,
              menu_item_ingredients: menuIngredients,
              ingredients: menuIngredients,
            };
          })
        );
      } catch (error) {
        if (isMounted) {
          setMenuError(
            error instanceof Error ? error.message : "Đã xảy ra lỗi khi tải thực đơn."
          );
        }
      } finally {
        if (isMounted) setIsMenuLoading(false);
      }
    };
    void loadMenu();
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleItems = useMemo(() => menuItems.filter((item) => {
    const matchesCategory = item.category === activeCategory;
    const query = search.trim().toLowerCase();
    return matchesCategory && (!query || item.name.toLowerCase().includes(query));
  }), [activeCategory, menuItems, search]);

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const serviceFee = orderType === "Giao hàng" ? 15000 : 0;
  const total = subtotal + serviceFee;

  const addToCart = (item: MenuItem) => {
    setCart((current) => {
      const found = current.find((cartItem) => cartItem.id === item.id);
      return found
        ? current.map((cartItem) => cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem)
        : [...current, {
          ...item,
          quantity: 1,
          adjustedIngredients: (item.ingredients ?? []).map((ingredient) => ({ ...ingredient })),
        }];
    });
  };

  const changeIngredientAmount = (
    menuItemId: string,
    ingredientId: string,
    amount: number
  ) => {
    const stockItem = inventoryItems.find(
      (inventoryItem) => inventoryItem.id === ingredientId
    );
    if (stockItem && stockItem.quantity <= 0) return;

    setCart((current) =>
      current.map((item) =>
        item.id === menuItemId
          ? {
            ...item,
            adjustedIngredients: item.adjustedIngredients.map((ingredient) =>
              ingredient.ingredient_id === ingredientId
                ? { ...ingredient, amount: Number.isFinite(amount) ? Math.max(0, amount) : 0 }
                : ingredient
            ),
          }
          : item
      )
    );
  };

  const changeQuantity = (id: string, amount: number) => setCart((current) => current.flatMap((item) => {
    if (item.id !== id) return [item];
    const quantity = item.quantity + amount;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  }));

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    if (inventoryError) {
      alert(`Không thể kiểm tra tồn kho nguyên liệu: ${inventoryError}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.orders.createOrder({
        table: selectedTable,
        orderType,
        lines: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          ingredients: item.adjustedIngredients.flatMap((ingredient) => {
            const stockItem = inventoryItems.find(
              (inventoryItem) => inventoryItem.id === ingredient.ingredient_id
            );
            return stockItem && stockItem.quantity > 0
              ? [{ ingredientId: ingredient.ingredient_id, amount: ingredient.amount * item.quantity }]
              : [];
          }),
        })),
        customerCount: guestCount,
        note: orderNote.trim() || undefined,
        serviceFee,
      });

      if (res.success) {
        alert("Đã tạo đơn hàng thành công!");
        setCart([]);
        setOrderNote("");
      } else {
        alert(res.error || "Không thể tạo đơn hàng.");
      }
    } catch {
      alert("Đã xảy ra lỗi khi tạo đơn hàng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Thực đơn hôm nay</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{visibleItems.length} món trong thực đơn</p>
            </div>
            <label className="relative block sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm món ăn..." className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:ring-3 focus:ring-amber-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
            </label>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto border-b border-gray-100 pb-3 dark:border-gray-800">
            {(["Combo", "Món chính", "Món thêm", "Đồ uống",] as Category[]).map((category) => (
              <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === category ? "bg-gray-900 text-white dark:bg-amber-500" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]"}`}>{category}</button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {isMenuLoading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex animate-pulse items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))
            ) : menuError ? (
              <p className="col-span-full py-8 text-center text-sm text-red-500">{menuError}</p>
            ) : visibleItems.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-gray-500 dark:text-gray-400">Không tìm thấy món ăn phù hợp.</p>
            ) : (
              visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-theme-sm dark:border-gray-800 dark:hover:border-amber-500/60"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-inner dark:bg-gray-800">
                    <Image
                      src={item.image || "/images/product/product-01.jpg"}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{item.name}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.active ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
                        {item.active ? "Còn món" : "Hết nguyên liệu"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    <p className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(item.price)}</p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-500/10"><PlusIcon /></span>
                </button>
              ))
            )}
          </div>
        </section>

        <aside className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Đơn hàng mới</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">#kiểm tra kỹ đơn hàng</p></div>
              <button onClick={() => setCart([])} className="text-xs font-medium text-red-500 hover:text-red-600">Xóa tất cả</button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-1 dark:bg-gray-600">
              {(["Tại quán", "Mang đi", "Giao hàng"] as CreateOrderInput["orderType"][]).map((type) => <button key={type} onClick={() => setOrderType(type)} className={`rounded-md px-2 py-2 text-xs font-medium transition ${orderType === type ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white" : "text-gray-500"}`}>{type}</button>)}
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Ghi chú đơn hàng</span>
              <textarea
                value={orderNote}
                onChange={(event) => setOrderNote(event.target.value)}
                rows={2}
                placeholder="Nhập ghi chú cho đơn hàng..."
                className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-3 focus:ring-amber-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </label>
            {orderType === "Tại quán" && (
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Chọn bàn</span>
                  <select value={selectedTable} onChange={(event) => setSelectedTable(event.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-3 focus:ring-amber-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                    {tables.map((table) => <option key={table} value={table}>{table}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Số khách</span>
                  <input type="number" min="0" max="50" step="0" value={guestCount} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) setGuestCount(Math.min(50, Math.max(0, Math.round(value)))); }} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-3 focus:ring-amber-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
                </label>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 p-5 sm:p-6">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">Chưa có món nào trong đơn.</div>
            ) : cart.map((item) => {
              const outOfStockIngredients = item.adjustedIngredients.filter((ingredient) =>
                inventoryItems.some(
                  (inventoryItem) =>
                    inventoryItem.id === ingredient.ingredient_id &&
                    inventoryItem.quantity <= 0
                )
              );
              const availableIngredients = item.adjustedIngredients.filter((ingredient) =>
                !outOfStockIngredients.includes(ingredient)
              );

              return (
              <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0 dark:border-gray-800">
                <div className="flex gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-amber-50 dark:bg-amber-500/10">
                    <Image src={item.image || "/images/product/product-01.jpg"} alt={item.name} fill sizes="44px" className="object-cover" unoptimized />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                    <p className="mt-1 text-xs text-amber-600">{formatCurrency(item.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" aria-label={`Giảm số lượng ${item.name}`} onClick={() => changeQuantity(item.id, -1)} className="h-6 w-6 rounded border border-gray-200 text-gray-500 dark:border-gray-700">−</button>
                      <span className="w-4 text-center text-xs font-semibold text-gray-800 dark:text-white/90">{item.quantity}</span>
                      <button type="button" aria-label={`Tăng số lượng ${item.name}`} onClick={() => changeQuantity(item.id, 1)} className="h-6 w-6 rounded border border-gray-200 text-gray-500 dark:border-gray-700">+</button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatCurrency(item.price * item.quantity)}</p>
                </div>
                <details className="group mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gray-50 px-3 py-2.5 text-left transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium text-gray-600 dark:text-gray-300">Định lượng</span>
                      {outOfStockIngredients.length > 0 && (
                        <span className="mt-0.5 block break-words text-[10px] leading-tight text-red-600 dark:text-red-400">
                          Hết hàng: {outOfStockIngredients.map((ingredient) =>
                            inventoryItems.find((stockItem) => stockItem.id === ingredient.ingredient_id)?.name
                              || ingredient.ingredient_id
                          ).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-300">{availableIngredients.length}</span>
                      <svg aria-hidden="true" className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180 dark:text-gray-400" viewBox="0 0 20 20" fill="none">
                        <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-gray-200 p-3 dark:border-gray-800">
                    {inventoryError && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">{inventoryError}; đang hiển thị mã nguyên liệu.</p>
                    )}
                    {item.adjustedIngredients.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Món chưa được khai báo nguyên liệu.</p>
                    ) : (
                      <div className="space-y-2">
                        {availableIngredients.map((ingredient) => {
                          const stockItem = inventoryItems.find(
                            (inventoryItem) => inventoryItem.id === ingredient.ingredient_id
                          );
                          const unit = stockItem?.unit || "";
                          const amountStep = item.quantity % 2 === 0 ? 0.5 : 1;
                          const updateAmount = (delta: number) => {
                            const nextValue = Number(Math.max(0, ingredient.amount + delta).toFixed(3));
                            changeIngredientAmount(item.id, ingredient.ingredient_id, nextValue);
                          };
                          
                          return (
                            <div key={ingredient.ingredient_id} className="rounded-lg">
                              <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                  {stockItem?.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    aria-label={`Giảm ${stockItem?.name}`}
                                    onClick={() => updateAmount(-amountStep)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-600 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:disabled:hover:border-gray-700"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    step={amountStep}
                                    value={ingredient.amount}
                                    onChange={(event) => changeIngredientAmount(
                                      item.id,
                                      ingredient.ingredient_id,
                                      event.target.value === "" ? 0 : Number(event.target.value)
                                    )}
                                    aria-label={`Định lượng ${stockItem?.name} cho món ${item.name}`}
                                    className="h-7 w-16 rounded-md border border-gray-200 bg-white px-1 text-center text-[11px] text-gray-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
                                  />
                                  <button
                                    type="button"
                                    aria-label={`Tăng ${stockItem?.name}`}
                                    onClick={() => updateAmount(amountStep)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-600 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:disabled:hover:border-gray-700"
                                  >
                                    +
                                  </button>
                                  <span className="min-w-6 text-right text-[10px] text-gray-500 dark:text-gray-400">{unit}</span>
                                </div>
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                Tổng cho {item.quantity} phần: {ingredient.amount * item.quantity} {unit}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </details>
              </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 p-5 dark:border-gray-800 sm:p-6">
            <div className="space-y-3 text-sm"><div className="flex justify-between text-gray-500"><span>Tạm tính</span><span className="font-medium text-gray-800 dark:text-white/90">{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-gray-500"><span>Phí giao hàng</span><span className="font-medium text-gray-800 dark:text-white/90">{serviceFee ? formatCurrency(serviceFee) : "Miễn phí"}</span></div><div className="flex justify-between border-t border-dashed border-gray-200 pt-3 text-base font-bold text-gray-900 dark:border-gray-700 dark:text-white"><span>Tổng cộng</span><span className="text-amber-600 dark:text-amber-400">{formatCurrency(total)}</span></div></div>
            <button
              onClick={handleConfirmOrder}
              disabled={cart.length === 0 || isSubmitting}
              className="mt-5 flex w-full items-center justify-center rounded-lg bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:text-white dark:hover:bg-amber-600"
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận đơn hàng"} <span className="ml-2">→</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default OrderCreation;