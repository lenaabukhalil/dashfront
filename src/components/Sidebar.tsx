import { NavLink } from "@/components/NavLink";
import { 
  Home, 
  Building2, 
  MapPin, 
  Zap, 
  Plug, 
  DollarSign, 
  Users, 
  FileText,
  Menu
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Organizations", url: "/organizations", icon: Building2 },
  { title: "Locations", url: "/locations", icon: MapPin },
  { title: "Chargers", url: "/chargers", icon: Zap },
  { title: "Connectors", url: "/connectors", icon: Plug },
  { title: "Tariffs", url: "/tariffs", icon: DollarSign },
  { title: "Users", url: "/users", icon: Users },
  { title: "Reports", url: "/reports", icon: FileText },
];

export const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">ION</div>
            <div className="text-xs text-muted-foreground">EV Charging</div>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:bg-muted transition-colors"
                activeClassName="bg-primary text-primary-foreground font-medium hover:bg-primary"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Card */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium">AU</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Admin User</div>
            <div className="text-xs text-muted-foreground truncate">admin@ion.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
