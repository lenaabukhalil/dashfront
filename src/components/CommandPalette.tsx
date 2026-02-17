import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import type { Permission } from "@/types/permissions";
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
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords: string[];
  permission?: string;
}

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();

  const commands: CommandItem[] = [
    {
      id: "dashboard",
      label: "Go to Dashboard",
      icon: Home,
      action: () => {
        navigate("/dashboard");
        setOpen(false);
      },
      keywords: ["dashboard", "home", "main"],
      permission: "dashboard.view",
    },
    {
      id: "organizations",
      label: "Organizations",
      icon: Building2,
      action: () => {
        navigate("/organizations");
        setOpen(false);
      },
      keywords: ["organizations", "orgs"],
      permission: "organizations.view",
    },
    {
      id: "locations",
      label: "Locations",
      icon: MapPin,
      action: () => {
        navigate("/locations");
        setOpen(false);
      },
      keywords: ["locations", "places"],
      permission: "locations.view",
    },
    {
      id: "chargers",
      label: "Chargers",
      icon: Zap,
      action: () => {
        navigate("/chargers");
        setOpen(false);
      },
      keywords: ["chargers", "stations"],
      permission: "chargers.view",
    },
    {
      id: "connectors",
      label: "Connectors",
      icon: Plug,
      action: () => {
        navigate("/connectors");
        setOpen(false);
      },
      keywords: ["connectors", "plugs"],
      permission: "connectors.view",
    },
    {
      id: "tariffs",
      label: "Tariffs",
      icon: DollarSign,
      action: () => {
        navigate("/tariffs");
        setOpen(false);
      },
      keywords: ["tariffs", "pricing", "rates"],
      permission: "tariffs.view",
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      action: () => {
        navigate("/users");
        setOpen(false);
      },
      keywords: ["users", "people"],
      permission: "users.view",
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      action: () => {
        navigate("/reports");
        setOpen(false);
      },
      keywords: ["reports", "analytics"],
      permission: "reports.view",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      action: () => {
        navigate("/settings");
        setOpen(false);
      },
      keywords: ["settings", "preferences", "config"],
      permission: "settings.view",
    },
    {
      id: "logout",
      label: "Logout",
      icon: Search,
      action: () => {
        logout();
        navigate("/login");
        setOpen(false);
      },
      keywords: ["logout", "sign out", "exit"],
    },
  ];

  const availableCommands = commands.filter(
    (cmd) => !cmd.permission || hasPermission(cmd.permission as Permission)
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-1">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Navigation">
              {availableCommands
                .filter((cmd) => !cmd.id.includes("logout"))
                .map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={cmd.action}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{cmd.label}</span>
                    </Command.Item>
                  );
                })}
            </Command.Group>
            <Command.Group heading="Actions">
              {availableCommands
                .filter((cmd) => cmd.id === "logout")
                .map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={cmd.action}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-destructive"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{cmd.label}</span>
                    </Command.Item>
                  );
                })}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
