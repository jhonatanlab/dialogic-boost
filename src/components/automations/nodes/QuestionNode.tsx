import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

type QuestionNodeData = Node<{
  label: string;
  question?: string;
  options?: string[];
}>;

const QuestionNode = memo(({ data, selected }: NodeProps<QuestionNodeData>) => {
  return (
    <Card className={`p-3 min-w-[200px] border-2 transition-colors ${selected ? 'border-primary shadow-lg' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
          <HelpCircle className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || "Fazer Pergunta"}</span>
      </div>
      
      {data.question && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-2">
          {data.question}
        </p>
      )}
      
      {data.options && data.options.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.options.map((opt, i) => (
            <span key={i} className="text-xs bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded">
              {opt}
            </span>
          ))}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
});

QuestionNode.displayName = "QuestionNode";

export default QuestionNode;
