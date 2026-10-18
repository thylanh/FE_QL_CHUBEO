"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authStorage, apiClient } from "@/lib/apiConfig";
import { User } from "@/type/interface";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // 1. Khởi tạo và khôi phục trạng thái đăng nhập khi tải lại trang (Reload)
  const initializeAuth = useCallback(async () => {
    try {
      const storedUser = authStorage.getUser();
      const storedToken = authStorage.getToken();
      if (storedUser) {
        setUser(storedUser);
      }
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra phiên đăng nhập:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 2. Hàm đăng nhập
  const login = async (username: string, password: string, remember: boolean = true) => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.login(username, password, remember);
      if (res.success && res.data) {
        setUser(res.data.user);
        setToken(res.data.token);
        router.push("/");
        return { success: true, user: res.data.user };
      } else {
        return { success: false, error: res.error || "Đăng nhập không thành công." };
      }
    } catch {
      return { success: false, error: "Lỗi mạng khi đăng nhập." };
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Hàm đăng xuất
  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.auth.logout();
    } catch (err) {
      console.warn("Lỗi khi gọi API đăng xuất:", err);
    } finally {
      authStorage.clear();
      setUser(null);
      setToken(null);
      setIsLoading(false);
      router.push("/signin");
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  }
  return context;
};
