import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface PageTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const PageTabs = ({ tabs, activeTab, onTabChange }: PageTabsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-6 mb-4">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return (
          <span key={tab.id} className="flex items-center gap-2">
            {index > 0 && (
              <span className="h-4 w-px bg-border shrink-0" aria-hidden />
            )}
            <button
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 text-sm pb-2 border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {tab.label}
            </button>
          </span>
        );
      })}
    </div>
  );
};
