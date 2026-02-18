import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { useNodeRedNotificationStream } from "@/hooks/useNodeRedNotificationStream";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  useNodeRedNotificationStream();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
      <div className="ml-0 lg:ml-64 min-w-0">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto min-w-0">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};
