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
    id?: string;
    employeeId: string;
    employee?: { id?: string; fullName?: string; code?: string };
    periodStart: string;
    periodEnd: string;
    baseSalary?: number;
    workingDays?: number;
    attendanceDays?: number;
    overtimeHours?: number;
    allowance?: number;
    deduction?: number;
    totalSalary?: number;
    status: PayrollStatus;
    paid?: boolean;
    createdAt?: string;
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
