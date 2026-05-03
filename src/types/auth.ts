export type UserType = 1 | 2 | 3 | 4 | 5 | 6; // 1=admin/owner, 2=manager, 3=engineer, 4=operator, 5=accountant, 6=viewer

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  avatar?: string;
  user_id?: number;
  organization_id?: number | null;
  mobile?: string;
  role_name?: string;
}

export interface LoginCredentials {
  login?: string;
  email?: string;
  mobile?: string;
  password: string;
  userType?: UserType;
}

import type { PermissionsMap } from "./permissions";

export interface AuthContextType {
  user: User | null;
  /** JWT permission codes from login /me (`R` | `RW`). */
  permissionsMap: PermissionsMap;
  /** Alias of `permissionsMap` for RBAC helpers that expect `permissions`. */
  permissions: PermissionsMap;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

