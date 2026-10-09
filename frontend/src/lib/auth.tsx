import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { SessionUser } from "./types";

interface AuthContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(() => api.sessionStore.get());

  const signOut = useCallback(() => {
    api.sessionStore.clear();
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  // any 401 from the API ends the session
  useEffect(() => api.onUnauthorized(signOut), [signOut]);

  // sign out by itself when the token expires
  useEffect(() => {
    if (!session) return;
    const ms = session.expiresAt - Date.now();
    if (ms <= 0) {
      signOut();
      return;
    }
    const t = window.setTimeout(signOut, Math.min(ms, 2 ** 31 - 1));
    return () => window.clearTimeout(t);
  }, [session, signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(api.sessionStore.set(await api.login(email, password)));
  }, []);

  const signUp = useCallback(async (input: { fullName: string; email: string; password: string }) => {
    setSession(api.sessionStore.set(await api.register(input)));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, isAdmin: session?.user.role === "ADMIN", signIn, signUp, signOut }),
    [session, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
