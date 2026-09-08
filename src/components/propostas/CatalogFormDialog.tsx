import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogField } from "./catalogTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: CatalogField[];
  initialValues?: Record<string, any> | null;
  saving?: boolean;
  computeValues?: (values: Record<string, any>) => Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
}

export function CatalogFormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialValues,
  saving,
  computeValues,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!open) return;
    const base: Record<string, any> = { is_active: true };
    fields.forEach((f) => {
      base[f.key] = initialValues?.[f.key] ?? (f.type === "switch" ? true : "");
    });
    if (initialValues?.id) base.id = initialValues.id;
    setValues(base);
  }, [open, initialValues, fields]);

  const setField = (key: string, value: any) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      return computeValues ? { ...next, ...computeValues(next) } : next;
    });
  };

  const handleSubmit = () => {
    const payload: Record<string, any> = { ...values };
    fields.forEach((f) => {
      if (f.type === "number") {
        payload[f.key] =
          payload[f.key] === "" || payload[f.key] === null || payload[f.key] === undefined
            ? null
            : Number(payload[f.key]);
      } else if (f.type !== "switch") {
        payload[f.key] = payload[f.key] === "" ? null : payload[f.key];
      }
    });
    onSubmit(payload);
  };

  const nameField = fields.find((f) => f.key === "name");
  const canSave = !nameField || !!String(values.name ?? "").trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div
                key={field.key}
                className={field.colSpan === 2 ? "sm:col-span-2 space-y-2" : "space-y-2"}
              >
                <Label htmlFor={field.key}>{field.label}</Label>

                {field.type === "textarea" && (
                  <Textarea
                    id={field.key}
                    rows={3}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setField(field.key, e.target.value)}
                  />
                )}

                {(field.type === "text" || field.type === "number") && (
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "number" : "text"}
                    step={field.step}
                    readOnly={field.readOnly}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setField(field.key, e.target.value)}
                  />
                )}

                {field.type === "select" && (
                  <Select
                    value={values[field.key] ?? ""}
                    onValueChange={(v) => setField(field.key, v)}
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder={field.placeholder ?? "Selecione"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === "switch" && (
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      id={field.key}
                      checked={!!values[field.key]}
                      onCheckedChange={(v) => setField(field.key, v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {values[field.key] ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
