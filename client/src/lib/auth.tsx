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
    const LOGIN_TIMEOUT_MS = 20000;
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;

    function isRetryableError(err: unknown): boolean {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      return (
        msg.includes("lock") ||
        msg.includes("lockmanager") ||
        msg.includes("timed out") ||
        msg.includes("timeout") ||
        msg.includes("load failed") ||
        msg.includes("network") ||
        msg.includes("failed to fetch") ||
        msg.includes("connection")
      );
    }

    function toUserMessage(err: unknown): string {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (msg.includes("invalid") && (msg.includes("credential") || msg.includes("password") || msg.includes("login")))
        return "Invalid email or password.";
      if (msg.includes("lock") || msg.includes("lockmanager") || msg.includes("timed out"))
        return "Sign-in took too long (often on mobile). Please try again.";
      if (msg.includes("load failed") || msg.includes("failed to fetch") || msg.includes("network"))
        return "Connection problem. Check your network and try again.";
      if (msg.includes("timeout") || msg.includes("connection"))
        return "Connection timed out. Please try again.";
      return err instanceof Error ? err.message : "Sign-in failed. Please try again.";
    }

    const timeoutPromise = () =>
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out. Please try again.")), LOGIN_TIMEOUT_MS)
      );

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const { data, error } = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          timeoutPromise(),
        ]);
        if (error) {
          lastError = error;
          if (import.meta.env.DEV) console.error("[Supabase Auth]", error.message, error);
          const raw = (error.message || "").toLowerCase();
          const isInvalidCreds =
            raw.includes("invalid") && (raw.includes("credential") || raw.includes("password") || raw.includes("login"));
          if (isInvalidCreds) return { success: false, message: "Invalid email or password." };
          if (!isRetryableError(error) || attempt === MAX_ATTEMPTS)
            return { success: false, message: error.message || "Invalid login credentials." };
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        if (!data.session?.user?.id) return { success: false, message: "Invalid login credentials." };
        const appUser = await fetchAppUser(data.session.user.id);
        if (!appUser) {
          await supabase.auth.signOut();
          return { success: false, message: "This account is not authorized to access the platform. Please contact your administrator." };
        }
        await setUserFromSession(data.session);
        return { success: true };
      } catch (err) {
        lastError = err;
        if (import.meta.env.DEV) console.error("[Supabase Auth]", err);
        if (attempt === MAX_ATTEMPTS) return { success: false, message: toUserMessage(err) };
        if (!isRetryableError(err)) return { success: false, message: toUserMessage(err) };
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    return { success: false, message: toUserMessage(lastError) };
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
