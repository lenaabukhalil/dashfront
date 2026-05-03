import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RouteGuard } from "@/components/RouteGuard";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Locations from "./pages/Locations";
import Organizations from "./pages/Organizations";
import Chargers from "./pages/Chargers";
import Connectors from "./pages/Connectors";
import Tariffs from "./pages/Tariffs";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import AuditLog from "./pages/AuditLog";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Monitoring from "./pages/Monitoring";
import Support from "./pages/Support";
import AppUsers from "./pages/AppUsers";
import SetupWizard from "./pages/SetupWizard";
import DeleteWizard from "./pages/DeleteWizard";
import NotFound from "./pages/NotFound";
import NotificationDetail from "./pages/NotificationDetail";
import Unauthorized from "./pages/Unauthorized";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionProvider>
          <AuditProvider>
            <SessionProvider>
              <NotificationProvider>
                <AlertProvider>
                  <LanguageProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route
                  path="/"
                  element={
                    <RouteGuard>
                      <Navigate to="/dashboard" replace />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <RouteGuard>
                      <Dashboard />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/setup-wizard"
                  element={
                    <RouteGuard>
                      <SetupWizard />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/delete-wizard"
                  element={
                    <RouteGuard permission="org.name" required="RW">
                      <DeleteWizard />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/locations"
                  element={
                    <RouteGuard permission="org.name">
                      <Locations />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/organizations"
                  element={
                    <RouteGuard permission="org.name">
                      <Organizations />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/chargers"
                  element={
                    <RouteGuard permission="charger.status">
                      <Chargers />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/connectors"
                  element={
                    <RouteGuard permission="charger.status">
                      <Connectors />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/tariffs"
                  element={
                    <RouteGuard permission="tariff">
                      <Tariffs />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RouteGuard permission="users.edit">
                      <Users />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RouteGuard permission="finance.reports">
                      <Reports />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/audit-log"
                  element={
                    <RouteGuard permission="finance.reports">
                      <AuditLog />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <RouteGuard permission="charger.status">
                      <Monitoring />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <RouteGuard permission="tickets.manage">
                      <Support />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/app-users"
                  element={
                    <RouteGuard permission="users.edit">
                      <AppUsers />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RouteGuard>
                      <Profile />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RouteGuard permission="users.edit">
                      <Settings />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/notifications/:notificationId"
                  element={
                    <RouteGuard>
                      <NotificationDetail />
                    </RouteGuard>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
                      </BrowserRouter>
                    </TooltipProvider>
                  </LanguageProvider>
                </AlertProvider>
              </NotificationProvider>
          </SessionProvider>
        </AuditProvider>
      </PermissionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
