import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { CatalogManager } from "./CatalogManager";
import type { CatalogField } from "./catalogTypes";
import { useSolarCatalog } from "@/hooks/useSolarCatalog";

const bankFields: CatalogField[] = [
  { key: "name", label: "Banco", type: "text", placeholder: "Ex: Santander" },
  { key: "is_active", label: "Status", type: "switch" },
  { key: "description", label: "Descrição", type: "textarea", colSpan: 2 },
];

const termFields: CatalogField[] = [
  { key: "term_months", label: "Prazo (meses)", type: "number" },
  { key: "monthly_interest_rate", label: "Juros ao mês (%)", type: "number", step: "0.0001" },
  { key: "is_active", label: "Status", type: "switch" },
];

export function FinancingSection() {
  const { data: banks = [], isLoading } = useSolarCatalog("solar_financing_banks");
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const selectedBank = useMemo(
    () => banks.find((b) => b.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          Bancos
        </h2>
        <CatalogManager
          table="solar_financing_banks"
          singularLabel="banco"
          fields={bankFields}
          showPrice={false}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Prazos e taxas
        </h2>

        {isLoading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
          </Card>
        ) : banks.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Cadastre um banco para adicionar prazos.
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {banks.map((b) => (
                <Button
                  key={b.id}
                  size="sm"
                  variant={selectedBankId === b.id ? "default" : "outline"}
                  onClick={() => setSelectedBankId(b.id)}
                  className="gap-2"
                >
                  {b.name}
                  {!b.is_active && (
                    <Badge variant="secondary" className="text-[10px]">
                      Inativo
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {selectedBank ? (
              <CatalogManager
                key={selectedBank.id}
                table="solar_financing_terms"
                singularLabel="prazo"
                fields={termFields}
                showPrice={false}
                showName={false}
                showDescription={false}
                showSearch={false}
                filter={(row) => row.bank_id === selectedBank.id}
                defaults={{ bank_id: selectedBank.id }}
                columns={[
                  { key: "term_months", label: "Prazo (meses)" },
                  {
                    key: "monthly_interest_rate",
                    label: "Juros ao mês (%)",
                    format: (r) =>
                      r.monthly_interest_rate === null || r.monthly_interest_rate === undefined
                        ? "-"
                        : `${r.monthly_interest_rate}%`,
                  },
                ]}
              />
            ) : (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Selecione um banco acima para ver e cadastrar seus prazos.
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
