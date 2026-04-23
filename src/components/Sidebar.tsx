import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Wrench,
  Sparkles,
  ClipboardList,
  Trash2,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionKey } from "@/lib/permissions";
import { useIsSidebarDrawer } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface NavItem {
  titleKey: string;
  subtitleKey?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  permissionAction?: "read" | "write";
}

const allNavItems: NavItem[] = [
  { titleKey: "sidebar.dashboard", subtitleKey: "sidebar.overview", url: "/dashboard", icon: Home },
  { titleKey: "sidebar.setupWizard", subtitleKey: "sidebar.setupWizardSub", url: "/setup-wizard", icon: Sparkles },
  { titleKey: "sidebar.deleteWizard", subtitleKey: "sidebar.deleteWizardSub", url: "/delete-wizard", icon: Trash2, permission: "org.name", permissionAction: "write" },
  { titleKey: "sidebar.organizations", subtitleKey: "sidebar.organizationsSub", url: "/organizations", icon: Building2, permission: "org.name", permissionAction: "read" },
  { titleKey: "sidebar.locations", subtitleKey: "sidebar.locationsSub", url: "/locations", icon: MapPin, permission: "charger.status", permissionAction: "read" },
  { titleKey: "sidebar.chargers", url: "/chargers", icon: Zap, permission: "charger.status", permissionAction: "read" },
  { titleKey: "sidebar.connectors", url: "/connectors", icon: Plug, permission: "charger.status", permissionAction: "read" },
  { titleKey: "sidebar.tariffs", url: "/tariffs", icon: DollarSign, permission: "tariff", permissionAction: "read" },
  { titleKey: "sidebar.users", subtitleKey: "sidebar.usersSub", url: "/users", icon: Users, permission: "users.edit", permissionAction: "read" },
  { titleKey: "sidebar.monitor", subtitleKey: "sidebar.monitorSub", url: "/monitoring", icon: Zap, permission: "charger.status", permissionAction: "read" },
  { titleKey: "sidebar.reports", subtitleKey: "sidebar.reportsSub", url: "/reports", icon: FileText, permission: "finance.reports", permissionAction: "read" },
  { titleKey: "sidebar.auditLog", subtitleKey: "sidebar.auditLogSub", url: "/audit-log", icon: ClipboardList, permission: "finance.reports", permissionAction: "read" },
  { titleKey: "sidebar.support", url: "/support", icon: Wrench },
  { titleKey: "sidebar.settings", subtitleKey: "sidebar.settingsSub", url: "/settings", icon: Settings, permission: "users.edit", permissionAction: "read" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

function SidebarNavContent({
  navItems,
  onLogout,
  onLinkClick,
  t,
}: {
  navItems: NavItem[];
  onLogout: () => void;
  onLinkClick?: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="p-5 flex items-center gap-3 border-b border-border shrink-0">
        <img
          src="/ion-logo.png"
          alt="ION"
          className="w-12 h-12 object-contain"
          loading="eager"
          decoding="async"
        />
        <div className="min-w-0">
          <div className="font-bold text-lg leading-tight">ION</div>
          <div className="text-sm text-muted-foreground">EV Charging</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto min-h-0">
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <li key={item.titleKey}>
              <NavLink
                to={item.url}
                onClick={onLinkClick}
                className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm text-foreground/70 hover:bg-muted transition-colors"
                activeClassName="bg-primary text-primary-foreground font-medium hover:bg-primary"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium truncate">{t(item.titleKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-3 pt-3 border-t border-border bg-muted/20 rounded-t-lg shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.15)]">
        <div className="px-2 pb-2.5 pt-0">
          <button
            type="button"
            onClick={() => {
              onLogout();
              onLinkClick?.();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("sidebar.logout")}</span>
          </button>
        </div>
      </div>
    </>
  );
}

export const Sidebar = ({ mobileOpen = false, onMobileOpenChange }: SidebarProps) => {
  const { logout, user } = useAuth();
  const { check } = usePermission();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isDrawer = useIsSidebarDrawer();

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
  const closeDrawer = () => onMobileOpenChange?.(false);

  const navContent = (
    <SidebarNavContent
      navItems={navItems}
      onLogout={handleLogout}
      onLinkClick={isDrawer ? closeDrawer : undefined}
      t={t}
    />
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col hidden lg:flex z-40">
        {navContent}
      </aside>

      {/* Mobile/tablet: drawer */}
      {isDrawer && (
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent side="left" className="w-64 p-0 flex flex-col bg-card border-border" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            {navContent}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
