import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginApi, getMeApi, setAuthToken, getAuthToken, type LoginResponse } from "@/services/api";
import type { User, LoginCredentials, AuthContextType } from "@/types/auth";
import type { PermissionsMap } from "@/types/permissions";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "ion_user";
const AUTH_STORAGE_KEY = "ion_auth";
const PERMISSIONS_STORAGE_KEY = "ion_permissions";

function readPermissionsFromStorage(): PermissionsMap {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw?.trim()) return {};
    return parsePermissions(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

function persistPermissionsMap(map: PermissionsMap): void {
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      return;
    }
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function permissionsFromLoginResponse(data: {
  permissions?: LoginResponse["permissions"];
  token?: string;
}): PermissionsMap {
  const fromBody = parsePermissions(data.permissions);
  if (Object.keys(fromBody).length > 0) return fromBody;
  const token = data.token;
  if (!token || typeof token !== "string") return {};
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { permissions?: unknown };
    return parsePermissions(payload?.permissions);
  } catch {
    return {};
  }
}

const roleNameToUserType = (role_name: string): User["userType"] => {
  const r = (role_name || "").toLowerCase();
  if (r === "owner" || r === "admin") return 1;
  if (r === "manager") return 2;
  if (r === "engineer") return 3;
  if (r === "operator") return 4;
  if (r === "accountant") return 5;
  if (r === "viewer") return 6;
  return 1;
};

function parsePermissions(raw: unknown): PermissionsMap {
  if (!raw) return {};

  // New format: { "org.logo": "RW", "tariff": "R" }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as PermissionsMap;
  }

  // Old format - array of strings: ["org.logo", "tariff"]
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    return Object.fromEntries(
      (raw as string[]).map((code) => [code, "R" as const])
    ) as PermissionsMap;
  }

  // Old format - array of objects: [{ code: "org.logo", access: "RW" }]
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") {
    return Object.fromEntries(
      (raw as { code: string; access: string }[])
        .filter((p) => p.code)
        .map((p) => [p.code, p.access === "RW" ? "RW" : "R"])
    ) as PermissionsMap;
  }

  return {};
}

const apiUserToUser = (u: {
  user_id: number;
  organization_id: number | null;
  mobile: string;
  role_name: string;
  first_name?: string;
  last_name?: string;
  f_name?: string;
  l_name?: string;
  email?: string;
  profile_img_url?: string | null;
}): User => ({
  id: String(u.user_id),
  email: (u.email ?? u.mobile ?? "").trim() || "",
  firstName: (u.first_name ?? u.f_name ?? "").trim(),
  lastName: (u.last_name ?? u.l_name ?? "").trim(),
  userType: roleNameToUserType(u.role_name),
  user_id: u.user_id,
  organization_id: u.organization_id,
  mobile: (u.mobile ?? "").trim(),
  role_name: u.role_name,
  avatar: (u.profile_img_url && u.profile_img_url.trim()) ? u.profile_img_url.trim() : undefined,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissionsMap, setPermissionsMap] = useState<AuthContextType["permissionsMap"]>(() =>
    getAuthToken() ? readPermissionsFromStorage() : {},
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setPermissionsMap({});
      setIsLoading(false);
      return;
    }
    getMeApi()
      .then((data) => {
        if (data.success && data.user) {
          const map = permissionsFromLoginResponse({
            permissions: data.permissions,
            token: getAuthToken() ?? undefined,
          });
          setUser(apiUserToUser(data.user));
          setPermissionsMap(map);
          persistPermissionsMap(map);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(apiUserToUser(data.user)));
          localStorage.setItem(AUTH_STORAGE_KEY, "true");
        } else {
          setAuthToken(null);
          setUser(null);
          setPermissionsMap({});
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
        }
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
        setPermissionsMap({});
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    const identifier = (credentials.login ?? credentials.email ?? credentials.mobile ?? "").toString().trim();
    const password = credentials.password;

    if (!identifier || !password) return false;

    setIsLoading(true);
    try {
      const data = await loginApi(identifier, password);
      const hasToken = !!data?.token;
      const hasUser = data?.user && typeof data.user === "object" && data.user.user_id != null;
      if (hasToken && hasUser) {
        const token = data.token!;
        setAuthToken(token);
        const u = apiUserToUser(data.user!);
        const map = permissionsFromLoginResponse({ permissions: data.permissions, token });
        setUser(u);
        setPermissionsMap(map);
        persistPermissionsMap(map);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
        return true;
      }
      if (import.meta.env.DEV && data) {
        console.warn("[Auth] Login response missing token or user:", { hasToken, hasUser, keys: data ? Object.keys(data) : [] });
      }
      return false;
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setPermissionsMap({});
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
  };

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) return;
    const data = await getMeApi();
    if (data.success && data.user) {
      const u = apiUserToUser(data.user);
      const map = permissionsFromLoginResponse({
        permissions: data.permissions,
        token: token ?? undefined,
      });
      setUser(u);
      setPermissionsMap(map);
      persistPermissionsMap(map);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissionsMap,
        permissions: permissionsMap,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
