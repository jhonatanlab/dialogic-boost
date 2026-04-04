import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DelayNodeData {
  label: string;
  delay?: number;
  unit?: "seconds" | "minutes" | "hours" | "days";
}

const DelayNode = memo(({ data, selected }: NodeProps<DelayNodeData>) => {
  const getUnitLabel = (unit?: string) => {
    switch (unit) {
      case "seconds": return "segundos";
      case "minutes": return "minutos";
      case "hours": return "horas";
      case "days": return "dias";
      default: return "segundos";
    }
  };

  return (
    <Card className={`p-3 min-w-[200px] border-2 transition-colors ${selected ? 'border-primary shadow-lg' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-500">
          <Clock className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || "Aguardar"}</span>
      </div>
      
      {data.delay && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          Aguardar {data.delay} {getUnitLabel(data.unit)}
        </p>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
});

DelayNode.displayName = "DelayNode";

export default DelayNode;
