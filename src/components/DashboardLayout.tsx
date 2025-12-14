import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
