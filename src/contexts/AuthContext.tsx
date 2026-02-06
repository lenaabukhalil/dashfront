import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, LoginCredentials, AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "ion_user";
const AUTH_STORAGE_KEY = "ion_auth";

// Mock users for demo (will be replaced with API later)
const MOCK_USERS = [
  {
    id: "1",
    email: "admin@ion.com",
    password: "admin123",
    firstName: "Admin",
    lastName: "User",
    userType: 1 as const,
  },
  {
    id: "2",
    email: "manager@ion.com",
    password: "manager123",
    firstName: "Manager",
    lastName: "User",
    userType: 2 as const,
  },
  {
    id: "3",
    email: "engineer@ion.com",
    password: "engineer123",
    firstName: "Engineer",
    lastName: "User",
    userType: 3 as const,
  },
  {
    id: "4",
    email: "operator@ion.com",
    password: "operator123",
    firstName: "Operator",
    lastName: "User",
    userType: 4 as const,
  },
  {
    id: "5",
    email: "accountant@ion.com",
    password: "accountant123",
    firstName: "Accountant",
    lastName: "User",
    userType: 5 as const,
  },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    
    if (storedUser && storedAuth === "true") {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Find user in mock data
      const foundUser = MOCK_USERS.find(
        (u) =>
          u.email === credentials.email &&
          u.password === credentials.password &&
          u.userType === credentials.userType
      );

      if (foundUser) {
        const userData: User = {
          id: foundUser.id,
          email: foundUser.email,
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          userType: foundUser.userType,
        };

        setUser(userData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

