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
} from "lucide-react";
import { useIsSidebarDrawer } from "@/hooks/use-mobile";
import { hasAccess } from "@/lib/route-permissions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

function getUserInitials(user: User): string {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName.slice(0, 2).toUpperCase();
  if (user.lastName) return user.lastName.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  if (user.mobile) return String(user.mobile).slice(0, 2).toUpperCase();
  return "?";
}

function SidebarNavContent({
  navItems,
  onLinkClick,
  t,
  user,
  onOpenAvatarDialog,
}: {
  navItems: NavItem[];
  onLinkClick?: () => void;
  t: (key: string) => string;
  user: User | null;
  onOpenAvatarDialog: () => void;
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
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
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
          <div className="min-w-0 pt-0.5 flex-1">
            <div className="text-base font-semibold text-foreground truncate">{t("sidebar.appTitle")}</div>
            {user && fullName ? (
              <div className="mt-0.5 text-xs text-muted-foreground truncate">
                {t("sidebar.greeting").replace("{name}", fullName)}
              </div>
            ) : null}
          </div>
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

      <div className="mt-auto border-t border-border px-4 py-5">
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
      </div>
    </>
  );
}

export const Sidebar = ({ mobileOpen = false, onMobileOpenChange }: SidebarProps) => {
  const { user, permissionsMap } = useAuth();
  const { t } = useLanguage();
  const isDrawer = useIsSidebarDrawer();
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const navItems = !user
    ? []
    : allNavItems.filter((item) => hasAccess(permissionsMap, item.url));
  const closeDrawer = () => onMobileOpenChange?.(false);

  const navContent = (
    <SidebarNavContent
      navItems={navItems}
      onLinkClick={isDrawer ? closeDrawer : undefined}
      t={t}
      user={user}
      onOpenAvatarDialog={() => setAvatarDialogOpen(true)}
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

      <EditAvatarDialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen} />
    </>
  );
};
