import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
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
  const { isAuthenticated, user, isLoading } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { check } = usePermission(role);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermission && role && !check(requiredPermission, requiredAction)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have the required permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

