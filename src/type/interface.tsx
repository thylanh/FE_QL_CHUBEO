//User and Role interfaces
export type Role = "ADMIN" | "MANAGER" | "STAFF";
export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: "ACTIVE" | "INACTIVE";
    phone?: string;
    createdAt: string;
}

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "RESIGNED";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "LEAVE" | "OFF" | "HOLIDAY";
export type PayrollStatus = "DRAFT" | "PAID";

export interface Employee {
    id: string;
    userId?: string | null;
    code?: string | null;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    department?: string | null;
    position?: string | null;
    hireDate?: string | null;
    status?: EmployeeStatus;
    baseSalary?: number | null;
    note?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface EmployeeAttendance {
    id?: string;
    employeeId: string;
    employee?: { id?: string; fullName?: string; code?: string };
    workDate: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status: AttendanceStatus;
    note?: string | null;
    hoursWorked?: number;
    createdAt?: string;
}

export interface EmployeePayroll {
    id: string;
    employeeId: string;
    month: string;
    totalMinutes: number;
    hourlyRate: number;
    baseSalary: number;
    bonus: number;
    deduction: number;
    netSalary: number;
    status: PayrollStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CalculatePayrollInput {
    employeeId: string;
    month?: string;
    hourlyRate?: number;
    baseSalary?: number;
    bonus?: number;
    deduction?: number;
}

// Menu and Inventory interfaces
export interface MenuIngredient {
  ingredient_id: string;
  amount: number;
}
export interface MenuItem {
    id: string;
    name: string;
    price: number;
    created_at: string;
    category: string | null;
    description: string | null;
    image: string | null;
    menu_item_ingredients: MenuIngredient[];
    ingredients?: MenuIngredient[];
    active: boolean;
}

// Inventory interfaces
export interface InventoryItem {
    id: string;
    name: string;
    unit: string;
    purchaseUnit?: string;
    conversionRate?: number;
    quantity: number;
    minQuantity: number;
    costPrice: number;
    isLowStock?: boolean;
    updatedAt: string;
}
export interface CreateInventoryItemInput {
    name: string;
    unit: string;
    purchaseUnit?: string;
    conversionRate?: number;
    quantity: number;
    minQuantity: number;
    costPrice: number;
}

export type InventoryTransactionType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryTransaction {
    id: string;
    inventoryItemId?: string;
    itemId?: string;
    inventoryItem?: Pick<InventoryItem, "id" | "name" | "unit">;
    itemName?: string;
    type: InventoryTransactionType;
    quantity: number;
    unit?: string;
    inputUnit?: string;
    unitCost?: number | null;
    totalCost?: number | null;
    referenceId?: string | null;
    note?: string | null;
    occurredAt?: string;
    createdAt?: string;
}

export interface InventoryTransactionItemSummary {
    inventoryItemId?: string;
    id?: string;
    itemId?: string;
    inventoryItem?: Pick<InventoryItem, "id" | "name" | "unit">;
    itemName?: string;
    name?: string;
    unit?: string;
    stockInQuantity?: number;
    stockOutQuantity?: number;
    totalIn?: number;
    totalOut?: number;
    importCost?: number;
    totalImportCost?: number;
    totalCost?: number;
}

export interface InventoryTransactionTotals {
    stockInQuantity?: number;
    stockOutQuantity?: number;
    totalIn?: number;
    totalOut?: number;
    importCost?: number;
    totalImportCost?: number;
    totalCost?: number;
}

export interface InventoryTransactionsResponse {
    transactions: InventoryTransaction[];
    totals?: InventoryTransactionTotals;
    summary?: InventoryTransactionTotals;
    totalInQuantity?: number;
    totalOutQuantity?: number;
    importCost?: number;
    totalImportCost?: number;
}

export interface InventoryTransactionSummaryResponse extends InventoryTransactionTotals {
    byItem?: InventoryTransactionItemSummary[];
    items?: InventoryTransactionItemSummary[];
}

export interface CreateInventoryStockInInput {
    quantity: number;
    inputUnit?: string;
    unitCost?: number;
    totalCost?: number;
    referenceId?: string;
    note?: string;
}

export interface CreateInventoryStockOutInput {
    quantity: number;
    inputUnit?: string;
    referenceId?: string;
    note?: string;
}

// Order interfaces
export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export interface OrderIngredient {
  ingredientId: string;
  name: string;
  amount: number;
}
export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  ingredients: OrderIngredient[];
}
export interface OrderReceipt {
  paperWidthMm: 80;
  title: string;
  order: {
    id: string;
    code: string;
    createdAt: string;
    orderType: Order['orderType'];
    table: string;
    customerCount: number;
    note?: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    subtotal: number;
    serviceFee: number;
    total: number;
  };
}
export interface Order {
  id: string;
  table: string;
  code: string;
  orderType: 'Tại quán' | 'Mang đi' | 'Giao hàng';
  lines: OrderItem[];
  customerCount: number;
  note?: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  inventoryDeducted: boolean;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
}
export interface CreateOrderInput {
  table: string;
  orderType: Order['orderType'];
  lines: Array<{
    menuItemId: string;
    quantity: number;
    ingredients: OrderIngredient[];
  }>;
  customerCount: number;
  note?: string;
  serviceFee: number;
}

export type CashbookType = "INCOME" | "EXPENSE";
export type CashbookCategory = "MISC_PURCHASE" | "SCRAP_SALE" | "OTHER";

export interface CashbookEntry {
  id: string;
  type: CashbookType;
  category: CashbookCategory;
  amount: number;
  description: string;
  occurredAt: string;
  note?: string | null;
  createdAt?: string | null;
}

export interface CashbookListResponse {
  entries: CashbookEntry[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface CreateCashbookEntryInput {
  type: CashbookType;
  category: CashbookCategory;
  amount: number;
  description: string;
  occurredAt?: string;
  note?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  calendar?: string;
  extendedProps?: {
    calendar?: string;
  };
}
