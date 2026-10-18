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
    quantity: number;
    minQuantity: number;
    costPrice: number;
    isLowStock?: boolean;
    updatedAt: string;
}
export interface CreateInventoryItemInput {
    name: string;
    unit: string;
    quantity: number;
    minQuantity: number;
    costPrice: number;
}

// Order interfaces
export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export interface OrderIngredient {
  ingredientId: string;
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
