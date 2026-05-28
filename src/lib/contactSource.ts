// Normaliza o valor de `contacts.source` em um label curto + estilo para badge.
export type SourceVariant = {
  label: string;
  full: string;
  className: string;
};

export function describeContactSource(source?: string | null): SourceVariant {
  const full = (source ?? "").trim();
  if (!full) {
    return {
      label: "Não informada",
      full: "Origem não informada",
      className: "bg-muted text-muted-foreground hover:bg-muted",
    };
  }

  const lower = full.toLowerCase();

  if (lower === "whatsapp") {
    return {
      label: "WhatsApp",
      full,
      className: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30",
    };
  }

  if (lower === "manual") {
    return {
      label: "Manual",
      full,
      className: "bg-muted text-muted-foreground hover:bg-muted",
    };
  }

  if (lower.startsWith("facebook lead ads") || lower.includes("facebook")) {
    return {
      label: "Facebook Ads",
      full,
      className: "bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 border-blue-500/30",
    };
  }

  if (lower.startsWith("landing-page") || lower.startsWith("landing")) {
    return {
      label: "Landing Page",
      full,
      className: "bg-violet-500/15 text-violet-600 hover:bg-violet-500/20 border-violet-500/30",
    };
  }

  if (lower.includes("instagram")) {
    return {
      label: "Instagram",
      full,
      className: "bg-pink-500/15 text-pink-600 hover:bg-pink-500/20 border-pink-500/30",
    };
  }

  if (lower.includes("import") || lower.includes("csv")) {
    return {
      label: "Importação",
      full,
      className: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-amber-500/30",
    };
  }

  // Default: usa o próprio valor (truncado pelo CSS) com tooltip
  return {
    label: full.length > 18 ? full.slice(0, 18) + "…" : full,
    full,
    className: "bg-primary/10 text-primary hover:bg-primary/15 border-primary/20",
  };
}
