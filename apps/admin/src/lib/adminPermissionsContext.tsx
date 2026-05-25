"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { adminFetch } from "@/lib/adminApi";
import type { PermissionKey } from "@/lib/permissionsCatalog";

interface SessionPayload {
  permissions: PermissionKey[];
  id: string;
  name: string;
}

interface AdminPermissionsContextValue {
  permissions: PermissionKey[];
  userId: string;
  userName: string;
  isLoading: boolean;
  can: (permission: PermissionKey) => boolean;
}

const AdminPermissionsContext = createContext<AdminPermissionsContextValue>({
  permissions: [],
  userId: "",
  userName: "",
  isLoading: true,
  can: () => false,
});

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await adminFetch<SessionPayload>("/api/session");
        if (!cancelled) {
          setSession(data);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AdminPermissionsContextValue>(() => {
    const permissions = session?.permissions ?? [];
    const set = new Set(permissions);
    return {
      permissions,
      userId: session?.id ?? "",
      userName: session?.name ?? "",
      isLoading,
      can: (permission) => set.has(permission),
    };
  }, [session, isLoading]);

  return (
    <AdminPermissionsContext.Provider value={value}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions(): AdminPermissionsContextValue {
  return useContext(AdminPermissionsContext);
}
