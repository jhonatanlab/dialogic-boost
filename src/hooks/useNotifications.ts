import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACA" +
  "f3+AgICAgICBgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/" +
  "wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/v7+/v79/fz8" +
  "+/v6+vn5+Pj39/b29fX09PPz8vLx8fDw7+/u7u3t7Ozr6+rq6eno6Ofn5ubl5eTk4+Pi4uHh4ODf397e3d3c3Nva2tnZ2NjX" +
  "19bW1dXU1NPT0tLR0dDQz8/OzszMy8vKysnJyMjHx8bGxcXExMPDwsLBwcDAv7++vr29vLy7u7q6ubm4uLe3tra1tbS0s7Oy" +
  "srGxsLCvr66ura2srKurqqqpqaiopqallpSSkI+NjIqJh4aEg4GAfn18e3l4d3Z1dHNycXBvbm1sa2ppZ2ZlZGNiYWBfXl1c" +
  "W1pZWFdWVVRTUlFQT05NTEtKSUhHRkVEQ0JBQD8+PTw7Ojk4NzY1NDMyMTAvLi0sKyopKCcmJSQjIiEgHx4dHBsaGRgXFhUU" +
  "ExIREA8ODQwLCgkIBwYFBAMCAQAAAgQGCAoMDhASFBYYGhweICIkJigqLC4wMjQ2ODo8Pj9BQUNFR0hKTE1PUVJUVldZWlxd" +
  "X2BiY2VmaGlrbG5vcXJzdXZ4eXt8fn+AgYOEhoeJiouNjpCRkpSVl5iZm5ydnqChoqSlpqeoqqusra+wsbO0tba4ubq8vb6/" +
  "wMHDxMXHyMnKzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+";

let audioCtx: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Fallback: ignore if audio fails
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  
  // If inside iframe, skip (won't work)
  try {
    if (window.self !== window.top) return;
  } catch { /* cross-origin, assume iframe */ return; }

  if (Notification.permission === "granted") {
    try {
      const n = new Notification(title, { 
        body, 
        icon: "/favicon.ico",
        tag: `elochat-${Date.now()}`,
        requireInteraction: false,
      });
      // Auto-close after 5s
      setTimeout(() => n.close(), 5000);
    } catch {
      // Fallback: ignore
    }
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    });
  }
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const currentUserIdRef = useRef<string | null>(null);
  const companyIdRef = useRef<string | null>(null);

  // Request permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      currentUserIdRef.current = user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.company_id) return;
      companyIdRef.current = profile.company_id;

      channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "conversations", filter: `company_id=eq.${profile.company_id}` },
          (payload) => {
            const conv = payload.new as any;
            // New conversation started
            playNotificationSound();
            showBrowserNotification(
              "Nova conversa",
              "Uma nova conversa foi iniciada"
            );
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `company_id=eq.${profile.company_id}` },
          (payload) => {
            const msg = payload.new as any;
            // Only notify for inbound messages (from contact)
            if (msg.direction !== "inbound") return;

            playNotificationSound();
            showBrowserNotification(
              "Nova mensagem",
              msg.content?.substring(0, 100) || "Você recebeu uma nova mensagem"
            );
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
