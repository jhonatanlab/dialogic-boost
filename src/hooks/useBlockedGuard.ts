import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Guards protected routes: if the current user's profile is blocked,
 * sign them out, show a clear message, and redirect to /auth.
 */
export function useBlockedGuard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!active) return;

      if (profile?.is_blocked) {
        setBlocked(true);
        await supabase.auth.signOut();
        toast.error("Acesso negado: sua conta foi bloqueada. Contate o administrador.");
        navigate("/auth", { replace: true });
        return;
      }

      setChecking(false);
    };

    check();
    return () => {
      active = false;
    };
  }, [navigate]);

  return { checking, blocked };
}
