// Helpers compartilhados da integração Zapster (https://developer.zapsterapi.com)
export const ZAPSTER_DEFAULT_BASE = "https://api.zapsterapi.com/v1";

export const zapsterBase = (baseUrl?: string | null) =>
  (baseUrl && baseUrl.trim() ? baseUrl.trim() : ZAPSTER_DEFAULT_BASE).replace(/\/+$/, "");

export const zapsterHeaders = (token: string) => ({
  Authorization: `Bearer ${token.replace(/[\r\n\t]/g, "").trim()}`,
  "Content-Type": "application/json",
});

export const zapsterErrorMessage = (payload: unknown, status: number): string => {
  const anyPayload = payload as any;
  const first = Array.isArray(anyPayload?.errors) ? anyPayload.errors[0] : null;
  return (
    first?.message ??
    anyPayload?.message ??
    (typeof payload === "string" ? payload : JSON.stringify(payload ?? {})) ??
    `HTTP ${status}`
  );
};

export const WEBHOOK_EVENTS = [
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "instance.connected",
  "instance.disconnected",
  "instance.qrcode",
];
