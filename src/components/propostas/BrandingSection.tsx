import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/hooks/useCompany";
import {
  FooterContact,
  getBrandingSignedUrl,
  removeBrandingAsset,
  uploadBrandingAsset,
  useSaveSolarBranding,
  useSolarBranding,
} from "@/hooks/useSolarBranding";

type ImageKind = "logo" | "cover";

function ImageField({
  label,
  kind,
  path,
  canManage,
  onChange,
}: {
  label: string;
  kind: ImageKind;
  path: string | null;
  canManage: boolean;
  onChange: (path: string | null) => void;
}) {
  const { companyId } = useCompany();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!path) {
      setPreview(null);
      return;
    }
    getBrandingSignedUrl(path).then((url) => {
      if (active) setPreview(url);
    });
    return () => {
      active = false;
    };
  }, [path]);

  const handleFile = async (file: File) => {
    if (!companyId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    setUploading(true);
    try {
      const newPath = await uploadBrandingAsset(companyId, kind, file);
      onChange(newPath);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível enviar a imagem");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (path) await removeBrandingAsset(path);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="h-24 w-40 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Sem imagem</span>
          )}
        </div>
        {canManage && (
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {path ? "Trocar imagem" : "Enviar imagem"}
            </Button>
            {path && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                <Trash2 className="h-4 w-4 mr-2" /> Remover
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const textFields = [
  { key: "about_us_text", label: "Sobre nós" },
  { key: "mission_text", label: "Missão" },
  { key: "vision_text", label: "Visão" },
  { key: "values_text", label: "Valores" },
] as const;

export function BrandingSection() {
  const { profile } = useCompany();
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const { data: branding, isLoading } = useSolarBranding();
  const saveBranding = useSaveSolarBranding();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#00D4D4");
  const [secondaryColor, setSecondaryColor] = useState("#0C1A3B");
  const [footerText, setFooterText] = useState("");
  const [contacts, setContacts] = useState<FooterContact[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    setLogoUrl(branding?.logo_url ?? null);
    setCoverUrl(branding?.cover_background_url ?? null);
    setPrimaryColor(branding?.primary_color || "#00D4D4");
    setSecondaryColor(branding?.secondary_color || "#0C1A3B");
    setFooterText(branding?.footer_text ?? "");
    setContacts(branding?.footer_contacts ?? []);
    const base: Record<string, string> = {};
    textFields.forEach((f) => {
      base[f.key] = (branding?.[f.key] as string | null) ?? "";
    });
    setTexts(base);
  }, [branding]);

  const handleSave = () => {
    const payload: Record<string, any> = {
      logo_url: logoUrl,
      cover_background_url: coverUrl,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      footer_text: footerText.trim() === "" ? null : footerText,
      footer_contacts: contacts.filter((c) => c.label.trim() || c.value.trim()),
    };
    textFields.forEach((f) => {
      payload[f.key] = texts[f.key]?.trim() === "" ? null : texts[f.key];
    });
    if (branding?.id) payload.id = branding.id;
    saveBranding.mutate(payload);
  };

  if (isLoading) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6 space-y-6">
        <h2 className="font-semibold">Identidade visual</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ImageField
            label="Logo da empresa"
            kind="logo"
            path={logoUrl}
            canManage={canManage}
            onChange={setLogoUrl}
          />
          <ImageField
            label="Imagem de capa"
            kind="cover"
            path={coverUrl}
            canManage={canManage}
            onChange={setCoverUrl}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Cor principal</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                className="w-14 p-1 h-10"
                disabled={!canManage}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <Input
                disabled={!canManage}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_color">Cor secundária</Label>
            <div className="flex gap-2">
              <Input
                id="secondary_color"
                type="color"
                className="w-14 p-1 h-10"
                disabled={!canManage}
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
              <Input
                disabled={!canManage}
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Rodapé</h2>
        <div className="space-y-2">
          <Label htmlFor="footer_text">Texto do rodapé</Label>
          <Textarea
            id="footer_text"
            rows={2}
            disabled={!canManage}
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Contatos</Label>
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
          )}
          {contacts.map((c, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Rótulo (ex: WhatsApp)"
                disabled={!canManage}
                value={c.label}
                onChange={(e) =>
                  setContacts((prev) =>
                    prev.map((item, idx) => (idx === i ? { ...item, label: e.target.value } : item))
                  )
                }
              />
              <Input
                placeholder="Valor (ex: (63) 90000-0000)"
                disabled={!canManage}
                value={c.value}
                onChange={(e) =>
                  setContacts((prev) =>
                    prev.map((item, idx) => (idx === i ? { ...item, value: e.target.value } : item))
                  )
                }
              />
              {canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setContacts((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setContacts((prev) => [...prev, { label: "", value: "" }])}
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar contato
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Textos institucionais</h2>
        {textFields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Textarea
              id={f.key}
              rows={3}
              disabled={!canManage}
              value={texts[f.key] ?? ""}
              onChange={(e) => setTexts((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveBranding.isPending}>
            Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
}
