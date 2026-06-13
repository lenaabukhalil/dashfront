import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, type AccessLevel } from "@/lib/evse-permissions";
import {
  getFirstAllowedRoute,
  hasAccessToPath,
  type RoutePermissionsMap,
} from "@/lib/route-permissions";

interface RouteGuardProps {
  permission?: string;
  required?: AccessLevel;
  children: ReactNode;
}

function redirectTarget(permissions: RoutePermissionsMap | null | undefined): ReactNode {
  const first = getFirstAllowedRoute(permissions);
  if (!first) return <Navigate to="/no-access" replace />;
  return <Navigate to={first} replace />;
}

export function RouteGuard({ permission, required = "R", children }: RouteGuardProps) {
  const { isAuthenticated, permissions, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasAccessToPath(permissions, location.pathname)) {
    return redirectTarget(permissions);
  }

  if (permission && !hasPermission(permissions, permission, required)) {
    return redirectTarget(permissions);
  }

  return <>{children}</>;
}

export function RedirectToFirstAllowedRoute() {
  const { permissions, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return redirectTarget(permissions);
}
