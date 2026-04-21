import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TriggerNodeData {
  label: string;
  triggerType?: string;
  keyword?: string;
}

const TriggerNode = memo(({ data, selected }: { data: TriggerNodeData; selected?: boolean }) => {
  return (
    <Card className={`p-3 min-w-[200px] border-2 transition-colors bg-gradient-to-br from-primary/5 to-primary/10 ${selected ? 'border-primary shadow-lg' : 'border-primary/30'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-primary/20 text-primary">
          <Zap className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || "Gatilho"}</span>
      </div>
      
      {data.triggerType && (
        <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
          {data.triggerType === 'keyword' && `Palavra-chave: "${data.keyword}"`}
          {data.triggerType === 'first_message' && 'Primeira mensagem'}
          {data.triggerType === 'all_messages' && 'Todas as mensagens'}
          {data.triggerType === 'inactivity' && `Sem resposta há ${data.inactivityMinutes || '?'} min`}
        </p>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
});

TriggerNode.displayName = "TriggerNode";

export default TriggerNode;
