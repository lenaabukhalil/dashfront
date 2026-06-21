import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User } from "@/types/auth";
import {
  Home,
  Building2,
  MapPin,
  Zap,
  Plug,
  DollarSign,
  Users,
  FileText,
  Settings,
  Wrench,
  Sparkles,
  ClipboardList,
  Trash2,
  Pencil,
  Menu,
} from "lucide-react";
import { hasAccess } from "@/lib/route-permissions";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import EditAvatarDialog from "./EditAvatarDialog";

interface NavItem {
  titleKey: string;
  subtitleKey?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const allNavItems: NavItem[] = [
  { titleKey: "sidebar.dashboard", subtitleKey: "sidebar.overview", url: "/dashboard", icon: Home },
  { titleKey: "sidebar.setupWizard", subtitleKey: "sidebar.setupWizardSub", url: "/setup-wizard", icon: Sparkles },
  { titleKey: "sidebar.deleteWizard", subtitleKey: "sidebar.deleteWizardSub", url: "/delete-wizard", icon: Trash2 },
  { titleKey: "sidebar.organizations", subtitleKey: "sidebar.organizationsSub", url: "/organizations", icon: Building2 },
  { titleKey: "sidebar.locations", subtitleKey: "sidebar.locationsSub", url: "/locations", icon: MapPin },
  { titleKey: "sidebar.chargers", url: "/chargers", icon: Zap },
  { titleKey: "sidebar.connectors", url: "/connectors", icon: Plug },
  { titleKey: "sidebar.tariffs", url: "/tariffs", icon: DollarSign },
  { titleKey: "sidebar.users", subtitleKey: "sidebar.usersSub", url: "/users", icon: Users },
  { titleKey: "sidebar.monitor", subtitleKey: "sidebar.monitorSub", url: "/monitoring", icon: Zap },
  { titleKey: "sidebar.reports", subtitleKey: "sidebar.reportsSub", url: "/reports", icon: FileText },
  { titleKey: "sidebar.auditLog", subtitleKey: "sidebar.auditLogSub", url: "/audit-log", icon: ClipboardList },
  { titleKey: "sidebar.support", url: "/support", icon: Wrench },
  { titleKey: "sidebar.settings", subtitleKey: "sidebar.settingsSub", url: "/settings", icon: Settings },
];

function getUserInitials(user: User): string {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName.slice(0, 2).toUpperCase();
  if (user.lastName) return user.lastName.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  if (user.mobile) return String(user.mobile).slice(0, 2).toUpperCase();
  return "?";
}

function SidebarNavItem({
  item,
  label,
  collapsed,
  onLinkClick,
}: {
  item: NavItem;
  label: string;
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  const link = (
    <NavLink
      to={item.url}
      onClick={onLinkClick}
      className={cn(
        "flex items-center rounded-lg text-sm text-foreground/70 hover:bg-muted transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2.5",
      )}
      activeClassName="bg-primary text-primary-foreground font-medium hover:bg-primary"
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed ? <span className="font-medium truncate">{label}</span> : null}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarNavContent({
  navItems,
  onLinkClick,
  t,
  user,
  onOpenAvatarDialog,
  collapsed,
  onToggle,
}: {
  navItems: NavItem[];
  onLinkClick?: () => void;
  t: (key: string) => string;
  user: User | null;
  onOpenAvatarDialog: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.id, user?.avatar]);

  const fullName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || user.mobile || ""
    : "";

  const showAvatar = Boolean(user?.avatar && !avatarError);

  return (
    <>
      <div
        className={cn(
          "shrink-0 border-b border-border",
          collapsed ? "flex justify-center p-2" : "p-2",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          aria-expanded={!collapsed}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className={cn("px-4 pt-4 pb-3", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-start gap-3",
            collapsed && "justify-center",
          )}
        >
          {user ? (
            <button
              type="button"
              onClick={onOpenAvatarDialog}
              aria-label={t("sidebar.editAvatar")}
              className="relative group h-10 w-10 rounded-xl border border-border bg-background flex items-center justify-center shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {showAvatar ? (
                <img
                  src={user.avatar}
                  alt={user.firstName || "Profile"}
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-base font-medium text-primary-foreground bg-primary">
                  {getUserInitials(user)}
                </span>
              )}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Pencil className="w-4 h-4 text-white" />
              </div>
            </button>
          ) : null}
          {!collapsed ? (
            <div className="min-w-0 pt-0.5 flex-1">
              <div className="text-base font-semibold text-foreground truncate">{t("sidebar.appTitle")}</div>
              {user && fullName ? (
                <div className="mt-0.5 text-xs text-muted-foreground truncate">
                  {t("sidebar.greeting").replace("{name}", fullName)}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto min-h-0">
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <li key={item.titleKey}>
              <SidebarNavItem
                item={item}
                label={t(item.titleKey)}
                collapsed={collapsed}
                onLinkClick={onLinkClick}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div
        className={cn(
          "mt-auto border-t border-border",
          collapsed ? "flex justify-center px-2 py-4" : "px-4 py-5",
        )}
      >
        {collapsed ? (
          <img
            src="/ion-logo.png"
            alt="ION"
            className="h-7 w-7 shrink-0 object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex items-center gap-3">
            <img
              src="/ion-logo.png"
              alt="ION"
              className="h-7 w-7 shrink-0 object-contain"
              loading="lazy"
              decoding="async"
            />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground/80 leading-tight">
                {t("sidebar.poweredBy")}
              </div>
              <div className="text-xs font-normal text-muted-foreground leading-tight whitespace-nowrap">
                {t("sidebar.poweredBySub")}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export const Sidebar = () => {
  const { user, permissionsMap } = useAuth();
  const { t } = useLanguage();
  const { collapsed, toggle } = useSidebarState();
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const navItems = !user
    ? []
    : allNavItems.filter((item) => hasAccess(permissionsMap, item.url));

  return (
    <>
      <aside
        className={cn(
          "fixed start-0 top-0 z-40 flex h-screen flex-col border-e border-border bg-card",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarNavContent
          navItems={navItems}
          t={t}
          user={user}
          onOpenAvatarDialog={() => setAvatarDialogOpen(true)}
          collapsed={collapsed}
          onToggle={toggle}
        />
      </aside>

      <EditAvatarDialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen} />
    </>
  );
};
