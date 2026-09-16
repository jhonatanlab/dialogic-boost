// Helpers compartilhados da integração VZaps (https://docs.vzaps.com)
export const VZAPS_DEFAULT_BASE = "https://api.vzaps.com";

export const vzapsBase = (baseUrl?: string | null) =>
  (baseUrl && baseUrl.trim() ? baseUrl.trim() : VZAPS_DEFAULT_BASE).replace(/\/+$/, "");

const clean = (v?: string | null) => (v || "").replace(/[\r\n\t]/g, "").trim();

/** Autenticação por instância: X-Instance-Token (+ X-Client-Token quando a conta exige). */
export const vzapsHeaders = (instanceToken: string, clientToken?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Instance-Token": clean(instanceToken),
  };
  const ct = clean(clientToken);
  if (ct) headers["X-Client-Token"] = ct;
  return headers;
};

/** Envelope padrão da VZaps: { code, success, data }. */
export const vzapsData = (payload: unknown): any => {
  const p = payload as any;
  if (p && typeof p === "object" && "data" in p) return p.data;
  return p;
};

export const vzapsErrorMessage = (payload: unknown, status: number): string => {
  const p = payload as any;
  const first = Array.isArray(p?.errors) ? p.errors[0] : null;
  return (
    first?.message ??
    p?.message ??
    p?.error ??
    p?.data?.error ??
    (typeof payload === "string" ? payload : JSON.stringify(payload ?? {})) ??
    `HTTP ${status}`
  );
};

/** Eventos assinados no webhook (string separada por vírgulas, nomes exatos da VZaps). */
export const VZAPS_WEBHOOK_EVENTS = "Message,ReadReceipt,Connected,Disconnected";
