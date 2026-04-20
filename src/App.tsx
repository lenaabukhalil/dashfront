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
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";
import NotificationDetail from "./pages/NotificationDetail";

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
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/setup-wizard"
                  element={
                    <ProtectedRoute>
                      <SetupWizard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/locations"
                  element={
                    <ProtectedRoute>
                      <Locations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizations"
                  element={
                    <ProtectedRoute>
                      <Organizations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chargers"
                  element={
                    <ProtectedRoute>
                      <Chargers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/connectors"
                  element={
                    <ProtectedRoute>
                      <Connectors />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tariffs"
                  element={
                    <ProtectedRoute>
                      <Tariffs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit-log"
                  element={
                    <ProtectedRoute>
                      <AuditLog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <ProtectedRoute>
                      <Monitoring />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <ProtectedRoute>
                      <Support />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app-users"
                  element={
                    <ProtectedRoute>
                      <AppUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications/:notificationId"
                  element={
                    <ProtectedRoute>
                      <NotificationDetail />
                    </ProtectedRoute>
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
