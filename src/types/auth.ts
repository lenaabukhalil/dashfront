export type UserType = 1 | 2 | 3 | 4 | 5; // 1=admin, 2=manager, 3=engineer, 4=operator, 5=accountant

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  userType: UserType;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

