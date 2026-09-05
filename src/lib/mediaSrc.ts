import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "whatsapp-media";
const SIGN_TTL = 60 * 60; // 1h

/** Storage path pattern saved by the native pipeline: <company_id>/<conversation_id>/<key>.<ext> */
const STORAGE_PATH_RE = /^[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\/[^/]+$/;

export const isStoragePath = (value: string): boolean => {
  if (!value) return false;
  if (/^(https?:|data:|blob:)/i.test(value)) return false;
  return STORAGE_PATH_RE.test(value.trim());
};

const signedCache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string | null>>();

export const getSignedMediaUrl = async (path: string): Promise<string | null> => {
  const cached = signedCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const existing = inflight.get(path);
  if (existing) return existing;

  const promise = (async () => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
    inflight.delete(path);
    if (error || !data?.signedUrl) return null;
    signedCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + (SIGN_TTL - 60) * 1000 });
    return data.signedUrl;
  })();

  inflight.set(path, promise);
  return promise;
};

const MIME_FALLBACK: Record<string, string> = {
  image: "image/jpeg",
  audio: "audio/ogg",
  video: "video/mp4",
  document: "application/octet-stream",
};

/** Synchronous resolution for links and base64. Storage paths return null (need signing). */
export const resolveMediaSrcSync = (
  url: string,
  mimetype: string | null,
  fallbackType: string
): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (isStoragePath(url)) return null;
  return `data:${mimetype || MIME_FALLBACK[fallbackType] || "application/octet-stream"};base64,${url}`;
};

/** Resolves any stored media reference (link, base64 or private storage path) to a usable src. */
export const resolveMediaSrcAsync = async (
  url: string,
  mimetype: string | null,
  fallbackType: string
): Promise<string | null> => {
  const sync = resolveMediaSrcSync(url, mimetype, fallbackType);
  if (sync) return sync;
  if (isStoragePath(url)) return getSignedMediaUrl(url.trim());
  return null;
};

/** React hook: returns the final src (null while a signed URL is being created). */
export const useMediaSrc = (
  url: string | null,
  mimetype: string | null,
  fallbackType: string
): string | null => {
  const sync = url ? resolveMediaSrcSync(url, mimetype, fallbackType) : null;
  const [src, setSrc] = useState<string | null>(sync);

  useEffect(() => {
    if (!url) { setSrc(null); return; }
    const immediate = resolveMediaSrcSync(url, mimetype, fallbackType);
    if (immediate) { setSrc(immediate); return; }
    let active = true;
    getSignedMediaUrl(url.trim()).then(signed => { if (active) setSrc(signed); });
    return () => { active = false; };
  }, [url, mimetype, fallbackType]);

  return src;
};
