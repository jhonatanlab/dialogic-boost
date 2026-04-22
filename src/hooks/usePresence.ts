import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds

export function usePresence() {
  const sessionStartRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let userId: string | null = null;
    let companyId: string | null = null;

    const goOnline = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.company_id) return;
      companyId = profile.company_id;

      const now = new Date().toISOString();
      sessionStartRef.current = now;

      await supabase
        .from("user_presence" as any)
        .upsert({
          user_id: userId,
          company_id: companyId,
          is_online: true,
          last_seen_at: now,
          session_started_at: now,
        }, { onConflict: "user_id" });
    };

    const heartbeat = async () => {
      if (!userId) return;
      await supabase
        .from("user_presence" as any)
        .update({ last_seen_at: new Date().toISOString(), is_online: true })
        .eq("user_id", userId);
    };

    const goOffline = async () => {
      if (!userId || !sessionStartRef.current) return;
      const sessionSeconds = Math.floor(
        (Date.now() - new Date(sessionStartRef.current).getTime()) / 1000
      );

      // Use rpc-less approach: read current total, then update
      const { data: current } = await supabase
        .from("user_presence" as any)
        .select("total_online_seconds")
        .eq("user_id", userId)
        .single();

      const newTotal = ((current as any)?.total_online_seconds || 0) + sessionSeconds;

      await supabase
        .from("user_presence" as any)
        .update({
          is_online: false,
          last_seen_at: new Date().toISOString(),
          total_online_seconds: newTotal,
          session_started_at: null,
        })
        .eq("user_id", userId);
    };

    goOnline();
    intervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    const handleBeforeUnload = () => {
      if (!userId || !sessionStartRef.current) return;
      const sessionSeconds = Math.floor(
        (Date.now() - new Date(sessionStartRef.current).getTime()) / 1000
      );
      // sendBeacon for reliable offline signal
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${userId}`;
      const body = JSON.stringify({
        is_online: false,
        last_seen_at: new Date().toISOString(),
        session_started_at: null,
      });
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (intervalRef.current) clearInterval(intervalRef.current);
      goOffline();
    };
  }, []);
}
