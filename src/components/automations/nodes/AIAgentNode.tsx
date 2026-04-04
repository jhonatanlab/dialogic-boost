import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Bot } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AIAgentNodeData {
  label: string;
  agentName?: string;
  prompt?: string;
}

const AIAgentNode = memo(({ data, selected }: NodeProps<AIAgentNodeData>) => {
  return (
    <Card className={`p-3 min-w-[200px] border-2 transition-colors ${selected ? 'border-primary shadow-lg' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-500">
          <Bot className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || "Agente IA"}</span>
      </div>
      
      {data.agentName && (
        <p className="text-xs font-medium text-violet-500 mb-1">
          {data.agentName}
        </p>
      )}
      
      {data.prompt && (
        <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
          {data.prompt}
        </p>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
});

AIAgentNode.displayName = "AIAgentNode";

export default AIAgentNode;
