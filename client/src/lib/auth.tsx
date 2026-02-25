import { createContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { AuthUser } from "@shared/schema";
import { supabase } from "@/lib/supabase";

export type LoginResult = { success: true } | { success: false; message: string };

type AuthContextType = {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);

async function fetchAppUser(userId: string): Promise<{ role: string; business_id: string | null; email: string; full_name: string | null } | null> {
  const { data, error } = await supabase.schema("umugwaneza").from("users").select("role, business_id, email, full_name").eq("auth_user_id", userId).eq("is_active", true).maybeSingle();
  if (error || !data) return null;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUserFromSession = useCallback(async (session: { user: { id: string; email?: string } } | null) => {
    if (!session?.user?.id) {
      setUser(null);
      return;
    }
    const appUser = await fetchAppUser(session.user.id);
    if (!appUser) {
      setUser(null);
      return;
    }
    const authUser: AuthUser = {
      role: appUser.role as "SYSTEM_ADMIN" | "OWNER",
      business_id: appUser.business_id ?? undefined,
      admin_name: appUser.role === "SYSTEM_ADMIN" ? (appUser.full_name || "System Admin") : undefined,
      owner_name: appUser.role === "OWNER" ? (appUser.full_name || "Owner") : undefined,
    };
    setUser(authUser);
  }, []);

  useEffect(() => {
    let mounted = true;

    const stopLoading = () => {
      if (mounted) setIsLoading(false);
    };

    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error && import.meta.env.DEV) console.error("[Supabase] getSession", error.message, error);
        if (session) await setUserFromSession(session);
      } catch (err) {
        if (import.meta.env.DEV) console.error("[Supabase] getSession failed", err);
      } finally {
        if (mounted) stopLoading();
      }
    })();

    const timeout = window.setTimeout(stopLoading, 2000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session) void setUserFromSession(session);
      else if (event === "SIGNED_OUT") setUser(null);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [setUserFromSession]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const LOGIN_TIMEOUT_MS = 15000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timed out. Check your network and try again.")), LOGIN_TIMEOUT_MS)
    );
    try {
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise,
      ]);
      if (error) {
        if (import.meta.env.DEV) console.error("[Supabase Auth]", error.message, error);
        const raw = (error.message || "").toLowerCase();
        const msg =
          raw.includes("invalid") && (raw.includes("credential") || raw.includes("password") || raw.includes("login"))
            ? "Invalid email or password."
            : error.message || "Invalid login credentials.";
        return { success: false, message: msg };
      }
      if (!data.session?.user?.id) {
        return { success: false, message: "Invalid login credentials." };
      }
      const appUser = await fetchAppUser(data.session.user.id);
      if (!appUser) {
        await supabase.auth.signOut();
        return { success: false, message: "This account is not authorized to access the platform. Please contact your administrator." };
      }
      await setUserFromSession(data.session);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network or server error. Please try again.";
      if (import.meta.env.DEV) console.error("[Supabase Auth]", message, err);
      return { success: false, message };
    }
  }, [setUserFromSession]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
