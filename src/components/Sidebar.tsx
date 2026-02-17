import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Home, 
  Building2, 
  MapPin, 
  Zap, 
  Plug, 
  DollarSign, 
  Users, 
  FileText,
  LogOut,
  Settings,
  Wrench
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionKey } from "@/lib/permissions";

interface NavItem {
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  permissionAction?: "read" | "write";
}

const allNavItems: NavItem[] = [
  { title: "Dashboard", subtitle: "Overview & Analytics", url: "/dashboard", icon: Home },
  { title: "Organizations", subtitle: "ION Partners Management", url: "/organizations", icon: Building2, permission: "org.name", permissionAction: "read" },
  { title: "Locations", subtitle: "Station Operations & Management", url: "/locations", icon: MapPin, permission: "charger.status", permissionAction: "read" },
  { title: "Chargers", url: "/chargers", icon: Zap, permission: "charger.status", permissionAction: "read" },
  { title: "Connectors", url: "/connectors", icon: Plug, permission: "charger.status", permissionAction: "read" },
  { title: "Tariffs", url: "/tariffs", icon: DollarSign, permission: "tariff", permissionAction: "read" },
  { title: "Users", subtitle: "Dashboard Users", url: "/users", icon: Users, permission: "users.edit", permissionAction: "read" },
  { title: "Monitor", subtitle: "Real-time Status & Sessions", url: "/monitoring", icon: Zap, permission: "charger.status", permissionAction: "read" },
  { title: "Reports", subtitle: "Revenue & Analytics", url: "/reports", icon: FileText, permission: "finance.reports", permissionAction: "read" },
  { title: "Support", subtitle: "Maintenance & SLA", url: "/support", icon: Wrench },
  { title: "Settings", subtitle: "System & Security", url: "/settings", icon: Settings, permission: "users.edit", permissionAction: "read" },
];

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const { check } = usePermission();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavItems = () => {
    if (!user) return [];
    return allNavItems.filter((item) => {
      if (!item.permission) return true;
      const action = item.permissionAction || "read";
      return check(item.permission as PermissionKey, action);
    });
  };

  const navItems = getNavItems();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      <div className="p-5 flex items-center gap-3 border-b border-border shrink-0">
        <img
          src="/ion-logo.png"
          alt="ION"
          className="w-12 h-12 object-contain"
          loading="eager"
          decoding="async"
        />
        <div>
          <div className="font-bold text-lg leading-tight">ION</div>
          <div className="text-sm text-muted-foreground">EV Charging</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm text-foreground/70 hover:bg-muted transition-colors"
                activeClassName="bg-primary text-primary-foreground font-medium hover:bg-primary"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium truncate">{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-3 pt-3 border-t border-border bg-muted/20 rounded-t-lg shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.15)]">
        <div className="px-2 pb-2.5 pt-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
