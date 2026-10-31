import { Role, User, MenuItem, InventoryItem, CreateInventoryItemInput, CreateOrderInput, Order, CalendarEvent } from "@/type/interface";

export type OrderPeriod = "today" | "week" | "month";

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: "/api/auth/login",
        LOGOUT: "/api/auth/logout",
        USERS: "/api/auth/users",
        REGISTER: "/api/auth/register",
        USER_BY_ID: (id: string) => `/api/auth/users/${id}`,
    },
    MENU: {
        LIST: "/api/menu",
        CREATE: "/api/menu",
        UPDATE: (id: string) => `/api/menu/${id}`,
        DELETE: (id: string) => `/api/menu/${id}`,
        ITEM_BY_ID: (id: string) => `/api/menu/${id}`,
    },
    ORDERS: {
        LIST: "/api/orders",
        CREATE: "/api/orders",
        UPDATE_STATUS: (id: string) => `/api/orders/${id}/status`,
    },
    INVENTORY: {
        LIST: "/api/inventory",
        CREATE: "/api/inventory",
        ITEM_BY_ID: (id: string) => `/api/inventory/${id}`,
        STOCK_IN: (id: string) => `/api/inventory/${id}/stock-in`,
        STOCK_OUT: (id: string) => `/api/inventory/${id}/stock-out`,
    },
    CALENDAR: {
        LIST: "/api/calendar",
        CREATE: "/api/calendar",
        ITEM_BY_ID: (id: string) => `/api/calendar/${id}`,
    },
    REPORTS: {
        REVENUE: (from?: string, to?: string) => {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            const query = params.toString();
            return `/api/reports/revenue${query ? `?${query}` : ""}`;
        },
    },
} as const;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");

// ==========================================
// Phân Quyền Nghiệp Vụ (RBAC)
// ==========================================
export type ActionPermission =
    | "MANAGE_USERS"          // ADMIN
    | "VIEW_ORDERS"           // ADMIN, MANAGER, STAFF
    | "CREATE_ORDER"          // ADMIN, MANAGER, STAFF
    | "UPDATE_ORDER_STATUS"   // ADMIN, MANAGER
    | "VIEW_INVENTORY"        // ADMIN, MANAGER, STAFF
    | "ADJUST_INVENTORY"      // ADMIN, MANAGER
    | "VIEW_REPORTS";         // ADMIN, MANAGER
export const ROLE_PERMISSIONS: Record<ActionPermission, Role[]> = {
    MANAGE_USERS: ["ADMIN"],
    VIEW_ORDERS: ["ADMIN", "MANAGER", "STAFF"],
    CREATE_ORDER: ["ADMIN", "MANAGER", "STAFF"],
    UPDATE_ORDER_STATUS: ["ADMIN", "MANAGER"],
    VIEW_INVENTORY: ["ADMIN", "MANAGER", "STAFF"],
    ADJUST_INVENTORY: ["ADMIN", "MANAGER"],
    VIEW_REPORTS: ["ADMIN", "MANAGER"],
};
export function hasPermission(role: Role | undefined | null, action: ActionPermission): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[action]?.includes(role) ?? false;
}

// ==========================================
// Client Storage Helper (Token & User)
// ==========================================
const TOKEN_KEY = "bunchubeo_token";
const USER_KEY = "bunchubeo_user";
export const authStorage = {
    getToken(): string | null {
        if (typeof window === "undefined") return null;
        try {
            return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    },
    setToken(token: string, remember: boolean = true): void {
        if (typeof window === "undefined") return;
        try {
            if (remember) {
                localStorage.setItem(TOKEN_KEY, token);
            } else {
                sessionStorage.setItem(TOKEN_KEY, token);
            }
        } catch { }
    },
    getUser(): User | null {
        if (typeof window === "undefined") return null;
        try {
            const str = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
            if (!str) return null;
            return JSON.parse(str);
        } catch {
            return null;
        }
    },
    setUser(user: User, remember: boolean = true): void {
        if (typeof window === "undefined") return;
        try {
            const val = JSON.stringify(user);
            if (remember) {
                localStorage.setItem(USER_KEY, val);
            } else {
                sessionStorage.setItem(USER_KEY, val);
            }
        } catch { }
    },
    clear(): void {
        if (typeof window === "undefined") return;
        try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
        } catch { }
    },
};

// ==========================================
// Typed API Client
// ==========================================
const pendingRequests = new Map<string, Promise<{ success: boolean; data?: unknown; error?: string; details?: null }>>();

function getRequestCacheKey(url: string, options: RequestInit): string {
    const method = (options.method || "GET").toUpperCase();
    const body = method === "GET" || method === "HEAD" ? "" : (options.body ?? "");
    return `${method}:${url}:${body}`;
}

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string; details?: null }> {
    const method = (options.method || "GET").toUpperCase();
    const cacheKey = getRequestCacheKey(url, options);

    if (method === "GET") {
        const existingRequest = pendingRequests.get(cacheKey);
        if (existingRequest) {
            return existingRequest as Promise<{ success: boolean; data?: T; error?: string; details?: null }>;
        }
    }

    const requestPromise = (async () => {
        const token = authStorage.getToken();
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string>),
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        try {
            const requestUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
            const response = await fetch(requestUrl, {
                ...options,
                headers,
                credentials: "include",
            });
            const json = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: json.error || `HTTP error ${response.status}`,
                    details: json.details,
                } as { success: boolean; data?: T; error?: string; details?: null };
            }
            if (json && typeof json === "object" && "success" in json && "data" in json) {
                return json as { success: boolean; data?: T; error?: string; details?: null };
            }
            return {
                success: true,
                data: json as T,
            } as { success: boolean; data?: T; error?: string; details?: null };
        } catch {
            return {
                success: false,
                error: "L?i k?t n?i m?y ch?.",
            } as { success: boolean; data?: T; error?: string; details?: null };
        }
    })();

    if (method === "GET") {
        pendingRequests.set(cacheKey, requestPromise);
    }

    try {
        return await requestPromise;
    } finally {
        if (method === "GET") {
            pendingRequests.delete(cacheKey);
        }
    }
}
export const apiClient = {
    auth: {
        async login(username: string, password: string, remember: boolean = true): Promise<{
            success: boolean;
            data?: { user: User; token: string };
            error?: string;
        }> {
            const res = await fetchWithAuth<{
                user?: Partial<User> & {
                    username?: string;
                    active?: boolean;
                    email?: string;
                    status?: User["status"];
                };
                token?: string;
                accessToken?: string;
            }>(API_ENDPOINTS.AUTH.LOGIN, {
                method: "POST",
                body: JSON.stringify({ username, password }),
            });

            const payload = (res.data ?? (res as { accessToken?: string; token?: string; user?: Partial<User> & { username?: string; active?: boolean; email?: string; status?: User["status"] } })) as {
                user?: Partial<User> & {
                    username?: string;
                    active?: boolean;
                    email?: string;
                    status?: User["status"];
                };
                token?: string;
                accessToken?: string;
            } | undefined;

            const token = payload?.accessToken ?? payload?.token;
            const backendUser = payload?.user;

            if (backendUser && token) {
                const user: User = {
                    id: backendUser.id || "",
                    name: backendUser.name || backendUser.username || "User",
                    email: backendUser.email || backendUser.username || `${backendUser.name || "user"}@local`,
                    role: backendUser.role || "STAFF",
                    status: backendUser.status || (backendUser.active === false ? "INACTIVE" : "ACTIVE"),
                    phone: backendUser.phone,
                    createdAt: backendUser.createdAt || new Date().toISOString(),
                };

                authStorage.setToken(token, remember);
                authStorage.setUser(user, remember);

                return {
                    success: true,
                    data: { user, token },
                };
            }
            return {
                success: false,
                error: res.error || "Đăng nhập không thành công.",
            };
        },
        async logout() {
            authStorage.clear();
            return fetchWithAuth(API_ENDPOINTS.AUTH.LOGOUT, { method: "POST" });
        },
        async getUsers() {
            return fetchWithAuth<User[]>(API_ENDPOINTS.AUTH.USERS);
        },
        async register(data: { name: string; email: string; password: string; role: Role; phone?: string }) {
            return fetchWithAuth<User>(API_ENDPOINTS.AUTH.REGISTER, {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        async updateUser(id: string, data: Partial<{ name: string; role: Role; phone: string; password: string; status: "ACTIVE" | "INACTIVE" }>) {
            return fetchWithAuth<User>(API_ENDPOINTS.AUTH.USER_BY_ID(id), {
                method: "PATCH",
                body: JSON.stringify(data),
            });
        },
        async deleteUser(id: string) {
            return fetchWithAuth<User>(API_ENDPOINTS.AUTH.USER_BY_ID(id), {
                method: "DELETE",
            });
        },
    },
    inventory: {
        async getInventory() {
            return fetchWithAuth<InventoryItem[]>(API_ENDPOINTS.INVENTORY.LIST);
        },
        async createInventoryItem(data: CreateInventoryItemInput) {
            return fetchWithAuth<InventoryItem>(API_ENDPOINTS.INVENTORY.CREATE, {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        async deleteInventoryItem(id: string) {
            return fetchWithAuth<InventoryItem>(API_ENDPOINTS.INVENTORY.ITEM_BY_ID(id), {
                method: "DELETE",
            });
        },
        async stockIn(id: string, quantity: number) {
            return fetchWithAuth<InventoryItem>(API_ENDPOINTS.INVENTORY.STOCK_IN(id), {
                method: "POST",
                body: JSON.stringify({ quantity }),
            });
        },
        async stockOut(id: string, quantity: number) {
            return fetchWithAuth<InventoryItem>(API_ENDPOINTS.INVENTORY.STOCK_OUT(id), {
                method: "POST",
                body: JSON.stringify({ quantity }),
            });
        },
    },
    menu: {
        async getMenu(active?: boolean) {
            const query = active === undefined ? "" : `?active=${active}`;
            return fetchWithAuth<MenuItem[]>(`${API_ENDPOINTS.MENU.LIST}${query}`);
        },
        async getMenuItem(id: string) {
            return fetchWithAuth<MenuItem>(API_ENDPOINTS.MENU.ITEM_BY_ID(id));
        },
        async createMenuItem(data: Partial<MenuItem>) {
            return fetchWithAuth<MenuItem>(API_ENDPOINTS.MENU.CREATE, {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        async updateMenuItem(id: string, data: Partial<MenuItem>) {
            return fetchWithAuth<MenuItem>(API_ENDPOINTS.MENU.UPDATE(id), {
                method: "PATCH",
                body: JSON.stringify(data),
            });
        },
        async deleteMenuItem(id: string) {
            return fetchWithAuth<MenuItem>(API_ENDPOINTS.MENU.DELETE(id), {
                method: "DELETE",
            });
        },
    },
    calendar: {
        async getCalendar(from?: string, to?: string) {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            const query = params.toString();
            return fetchWithAuth<CalendarEvent[]>(`${API_ENDPOINTS.CALENDAR.LIST}${query ? `?${query}` : ""}`);
        },
        async createCalendarEvent(data: Partial<CalendarEvent> & { title: string; start: string; calendar?: string }) {
            return fetchWithAuth<CalendarEvent>(API_ENDPOINTS.CALENDAR.CREATE, {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        async updateCalendarEvent(id: string, data: Partial<CalendarEvent> & { title?: string; start?: string; calendar?: string }) {
            return fetchWithAuth<CalendarEvent>(API_ENDPOINTS.CALENDAR.ITEM_BY_ID(id), {
                method: "PATCH",
                body: JSON.stringify(data),
            });
        },
        async deleteCalendarEvent(id: string) {
            return fetchWithAuth<CalendarEvent>(API_ENDPOINTS.CALENDAR.ITEM_BY_ID(id), {
                method: "DELETE",
            });
        },
    },
    orders: {
        async getOrders(period: OrderPeriod = "today") {
            const search = new URLSearchParams();
            search.append("period", period);
            return fetchWithAuth<Order[]>(`${API_ENDPOINTS.ORDERS.LIST}?${search.toString()}`);
        },
        async createOrder(data: CreateOrderInput) {
            return fetchWithAuth<Order>(API_ENDPOINTS.ORDERS.CREATE, {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        async updateStatus(id: string, status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED") {
            return fetchWithAuth<Order>(API_ENDPOINTS.ORDERS.UPDATE_STATUS(id), {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
        },
    },
};
