import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, allowChangePassword = false }: { children: React.ReactNode; allowChangePassword?: boolean }) => {
  const { user, loading } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("must_change_password")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setMustChangePassword(data?.must_change_password ?? false);
        });
    }
  }, [user]);

  if (loading || (user && mustChangePassword === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && !allowChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};
