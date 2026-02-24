import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AuthUser } from "@shared/schema";

type AuthContextType = {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("umugwaneza_auth");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((email: string, password: string): boolean => {
    if (email === "admin@umugwaneza.rw" && password === "123456") {
      const authUser: AuthUser = { role: "SYSTEM_ADMIN", admin_name: "System Admin" };
      localStorage.setItem("umugwaneza_auth", JSON.stringify(authUser));
      setUser(authUser);
      return true;
    }
    if (email === "owner@umugwaneza.rw" && password === "123456") {
      const authUser: AuthUser = { role: "OWNER", owner_name: "UMUGWANEZA OWNER", business_id: "biz_001" };
      localStorage.setItem("umugwaneza_auth", JSON.stringify(authUser));
      setUser(authUser);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("umugwaneza_auth");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
