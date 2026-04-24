import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INACTIVITY_MS = 40 * 60 * 1000; // 40 minutes
const WARNING_MS = 60 * 1000; // 1 minute before logout
const DEBOUNCE_MS = 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function useAutoLogout() {
  const navigate = useNavigate();
  const lastActivityRef = useRef<number>(Date.now());
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<number>(0);
  const warnedRef = useRef<boolean>(false);

  useEffect(() => {
    const performLogout = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Mark presence offline before sign-out
          await supabase
            .from("user_presence")
            .update({
              is_online: false,
              last_seen_at: new Date().toISOString(),
              session_started_at: null,
            })
            .eq("user_id", user.id);
        }
      } catch (err) {
        console.error("[auto-logout] presence update failed:", err);
      }

      await supabase.auth.signOut();
      toast.error("Sessão encerrada por inatividade (40 minutos sem atividade)");
      navigate("/auth");
    };

    const scheduleTimers = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warnedRef.current = false;

      warningTimerRef.current = setTimeout(() => {
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast.warning("Você será desconectado em 1 minuto por inatividade");
        }
      }, INACTIVITY_MS - WARNING_MS);

      logoutTimerRef.current = setTimeout(() => {
        performLogout();
      }, INACTIVITY_MS);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - debounceRef.current < DEBOUNCE_MS) return;
      debounceRef.current = now;
      lastActivityRef.current = now;
      scheduleTimers();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onActivity();
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibility);

    scheduleTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity)
      );
      document.removeEventListener("visibilitychange", onVisibility);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [navigate]);
}
