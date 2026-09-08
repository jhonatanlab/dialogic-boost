import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

const BUCKET = "branding-assets";
const SIGN_TTL = 60 * 60;

export interface FooterContact {
  label: string;
  value: string;
}

export interface SolarBranding {
  id?: string;
  company_id?: string;
  logo_url: string | null;
  cover_background_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  footer_text: string | null;
  footer_contacts: FooterContact[];
  about_us_text: string | null;
  mission_text: string | null;
  vision_text: string | null;
  values_text: string | null;
}

export function useSolarBranding() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["solar_branding", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("solar_branding" as any) as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        footer_contacts: Array.isArray(data.footer_contacts) ? data.footer_contacts : [],
      } as SolarBranding;
    },
  });
}

export function useSaveSolarBranding() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: async (values: Partial<SolarBranding>) => {
      const { error } = await (supabase.from("solar_branding" as any) as any).upsert(
        { ...values, company_id: companyId },
        { onConflict: "company_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solar_branding"] });
      toast.success("Personalização salva com sucesso");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar"),
  });
}

/** Uploads a branding image and returns its storage path. */
export async function uploadBrandingAsset(
  companyId: string,
  kind: "logo" | "cover",
  file: File
): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${companyId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function removeBrandingAsset(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

const signedCache = new Map<string, { url: string; expiresAt: number }>();

export async function getBrandingSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const cached = signedCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  if (error || !data?.signedUrl) return null;
  signedCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGN_TTL - 60) * 1000,
  });
  return data.signedUrl;
}
