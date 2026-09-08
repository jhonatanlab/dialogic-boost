import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Loader2, Plus, Search, Trash2 } from "lucide-react";
import {
  useSolarCatalog,
  useSaveSolarItem,
  useDeleteSolarItem,
  type SolarTable,
  type CatalogRow,
} from "@/hooks/useSolarCatalog";
import { useCompany } from "@/hooks/useCompany";
import { CatalogFormDialog } from "./CatalogFormDialog";
import type { CatalogColumn, CatalogField } from "./catalogTypes";

interface Props {
  table: SolarTable;
  singularLabel: string;
  fields: CatalogField[];
  columns?: CatalogColumn[];
  showPrice?: boolean;
  showName?: boolean;
  showDescription?: boolean;
  showSearch?: boolean;
  filter?: (row: CatalogRow) => boolean;
  defaults?: Record<string, any>;
  computeValues?: (values: Record<string, any>) => Record<string, any>;
}

const formatPrice = (value: any) =>
  value === null || value === undefined || value === ""
    ? "-"
    : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CatalogManager({
  table,
  singularLabel,
  fields,
  columns = [],
  showPrice = true,
  computeValues,
}: Props) {
  const { profile } = useCompany();
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const { data: rows = [], isLoading } = useSolarCatalog(table);
  const saveItem = useSaveSolarItem(table);
  const deleteItem = useDeleteSolarItem(table);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);

  const filtered = rows.filter((r) =>
    (r.name ?? "").toLowerCase().includes(search.trim().toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: CatalogRow) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleSubmit = (values: Record<string, any>) => {
    saveItem.mutate(values, { onSuccess: () => setDialogOpen(false) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <Button onClick={openNew} className="gap-1">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              <TableHead>Descrição</TableHead>
              {showPrice && <TableHead>Preço</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 5} className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 5}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  Nenhum registro cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.key} className="text-sm">
                      {c.format ? c.format(row) : (row[c.key] ?? "-")}
                    </TableCell>
                  ))}
                  <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                    {row.description || "-"}
                  </TableCell>
                  {showPrice && <TableCell className="text-sm">{formatPrice(row.price)}</TableCell>}
                  <TableCell>
                    <Badge variant={row.is_active ? "default" : "outline"} className="text-[10px]">
                      {row.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(row)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir "${row.name}"?`)) deleteItem.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CatalogFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Editar ${singularLabel}` : `Novo ${singularLabel}`}
        fields={fields}
        initialValues={editing}
        saving={saveItem.isPending}
        computeValues={computeValues}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
