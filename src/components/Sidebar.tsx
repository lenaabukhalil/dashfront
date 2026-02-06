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
import { userTypeToRole } from "@/lib/rbac-helpers";

interface NavItem {
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  permissionAction?: "read" | "write";
}

const allNavItems: NavItem[] = [
  // 1. Dashboard
  { title: "Dashboard", subtitle: "Overview & Analytics", url: "/dashboard", icon: Home },
  // 2. Organizations
  { title: "Organizations", subtitle: "ION Partners Management", url: "/organizations", icon: Building2, permission: "org.name", permissionAction: "read" },
  // 3. Locations
  { title: "Locations", subtitle: "Station Operations & Management", url: "/locations", icon: MapPin },
  // 4. Chargers
  { title: "Chargers", url: "/chargers", icon: Zap, permission: "charger.chargerStatus", permissionAction: "read" },
  // 5. Connectors
  { title: "Connectors", url: "/connectors", icon: Plug },
  // 6. Tariffs
  { title: "Tariffs", url: "/tariffs", icon: DollarSign, permission: "org.tariff", permissionAction: "read" },
  // 7. Users
  { title: "Users", subtitle: "Dashboard Users", url: "/users", icon: Users, permission: "users.editUsers", permissionAction: "read" },
  // 8. Monitoring
  { title: "Monitor", subtitle: "Real-time Status & Sessions", url: "/monitoring", icon: Zap },
  // 9. Reports
  { title: "Reports", subtitle: "Revenue & Analytics", url: "/reports", icon: FileText, permission: "finance.financialReports", permissionAction: "read" },
  // 10. Support
  { title: "Support", subtitle: "Maintenance & SLA", url: "/support", icon: Wrench },
  // 11. Settings
  { title: "Settings", subtitle: "System & Security", url: "/settings", icon: Settings },
];

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { check } = usePermission(role);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Filter nav items based on RBAC permissions
  const getNavItems = () => {
    if (!user || !role) return [];
    
    return allNavItems.filter((item) => {
      // If no permission required, show item
      if (!item.permission) return true;
      
      // Check permission with action (default to read)
      const action = item.permissionAction || "read";
      return check(item.permission as any, action);
    });
  };

  const navItems = getNavItems();

  // Get role-based color theme
  const getRoleColor = () => {
    if (!user) return "bg-primary";
    switch (user.userType) {
      case 1: return "bg-red-500"; // Admin
      case 2: return "bg-purple-500"; // Manager
      case 3: return "bg-orange-500"; // Engineer
      case 4: return "bg-blue-500"; // Operator
      case 5: return "bg-green-500"; // Accountant
      default: return "bg-primary";
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/ion-logo.png"
            alt="ION"
            className="w-10 h-10 object-contain"
            loading="eager"
            decoding="async"
          />
          <div>
            <div className="font-bold text-lg leading-tight">ION</div>
            <div className="text-xs text-muted-foreground">EV Charging</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:bg-muted transition-colors"
                activeClassName="bg-primary text-primary-foreground font-medium hover:bg-primary"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium truncate">{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
