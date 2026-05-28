import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AgendaView = "month" | "week" | "day";

interface Props {
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function AgendaToolbar({ view, onViewChange, label, onPrev, onNext, onToday }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrev} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" onClick={onNext} aria-label="Próximo">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-2 text-base font-semibold capitalize">{label}</span>
      </div>

      <Tabs value={view} onValueChange={(v) => onViewChange(v as AgendaView)}>
        <TabsList>
          <TabsTrigger value="month">Mensal</TabsTrigger>
          <TabsTrigger value="week">Semanal</TabsTrigger>
          <TabsTrigger value="day">Diária</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
