import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { hasPermission } from "@/lib/evse-permissions";
import type { PermissionKey, PermissionAction } from "@/lib/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: number[];
  requiredPermission?: PermissionKey;
  requiredAction?: PermissionAction;
}

export const ProtectedRoute = ({
  children,
  allowedUserTypes,
  requiredPermission,
  requiredAction = "read",
}: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading, permissions } = useAuth();

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

  if (allowedUserTypes && user && !allowedUserTypes.includes(user.userType)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    requiredPermission &&
    !hasPermission(permissions, requiredPermission, requiredAction === "write" ? "RW" : "R")
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

