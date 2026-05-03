import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, type AccessLevel } from "@/lib/evse-permissions";

interface RouteGuardProps {
  permission?: string;
  required?: AccessLevel;
  children: ReactNode;
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

  if (permission && !hasPermission(permissions, permission, required)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
