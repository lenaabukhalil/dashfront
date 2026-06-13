import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const NoAccess = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <h1 className="text-2xl font-semibold mb-2">No access</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Your account does not have permission to view any dashboard pages. Contact an administrator
        if you believe this is a mistake.
      </p>
      <Button type="button" variant="outline" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
};

export default NoAccess;
