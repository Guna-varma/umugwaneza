import { useContext } from "react";
import { AuthContext } from "@/lib/auth";

/** Hook for auth context. Separate file so Fast Refresh works with AuthProvider in auth.tsx. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
