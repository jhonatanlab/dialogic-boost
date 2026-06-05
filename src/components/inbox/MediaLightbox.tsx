import React, { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";

export type LightboxItem = { url: string; type: "image" | "video" };

type OpenPayload = { items: LightboxItem[]; index: number };

const EVENT_NAME = "media-lightbox:open";

export const openMediaLightbox = (payload: OpenPayload) => {
  window.dispatchEvent(new CustomEvent<OpenPayload>(EVENT_NAME, { detail: payload }));
};

export const MediaLightbox: React.FC = () => {
  const [state, setState] = useState<OpenPayload | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenPayload>).detail;
      if (!detail || !detail.items?.length) return;
      setState({ items: detail.items, index: Math.max(0, Math.min(detail.index, detail.items.length - 1)) });
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const close = useCallback(() => setState(null), []);
  const prev = useCallback(() => {
    setState(s => (s ? { ...s, index: (s.index - 1 + s.items.length) % s.items.length } : s));
  }, []);
  const next = useCallback(() => {
    setState(s => (s ? { ...s, index: (s.index + 1) % s.items.length } : s));
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close, prev, next]);

  if (!state) return null;

  const current = state.items[state.index];
  const hasMany = state.items.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in"
      onClick={close}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-3 z-10 text-white">
        <span className="text-xs opacity-70 tabular-nums">
          {hasMany ? `${state.index + 1} / ${state.items.length}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          <a
            href={current.url}
            download
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Baixar"
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Prev/Next */}
      {hasMany && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title="Anterior (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title="Próxima (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Media */}
      <div className="max-w-[92vw] max-h-[88vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {current.type === "image" ? (
          <img
            src={current.url}
            alt=""
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-md"
          />
        ) : (
          <video
            src={current.url}
            controls
            autoPlay
            className="max-w-[92vw] max-h-[88vh] rounded-md"
          />
        )}
      </div>
    </div>
  );
};
