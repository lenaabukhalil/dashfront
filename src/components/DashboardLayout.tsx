import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { useNodeRedNotificationStream } from "@/hooks/useNodeRedNotificationStream";
import { useSidebarState } from "@/hooks/useSidebarState";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  useNodeRedNotificationStream();
  const { collapsed } = useSidebarState();

  return (
    <div className="min-h-screen w-full bg-background">
      <Sidebar />
      <div
        className={cn(
          "min-w-0 transition-[margin] duration-200 ease-in-out",
          collapsed ? "ms-16" : "ms-64",
        )}
      >
        <Header />
        <main className="overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto min-w-0">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};
