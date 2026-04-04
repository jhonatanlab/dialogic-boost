import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ConditionNodeData {
  label: string;
  condition?: string;
}

const ConditionNode = memo(({ data, selected }: { data: ConditionNodeData; selected?: boolean }) => {
  return (
    <Card className={`p-3 min-w-[200px] border-2 transition-colors ${selected ? 'border-primary shadow-lg' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-500">
          <GitBranch className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || "Condição"}</span>
      </div>
      
      {data.condition && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          Se: {data.condition}
        </p>
      )}
      
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-green-500">Sim</span>
        <span className="text-red-500">Não</span>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="yes" 
        className="!bg-green-500 !w-3 !h-3 !left-[25%]" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="no" 
        className="!bg-red-500 !w-3 !h-3 !left-[75%]" 
      />
    </Card>
  );
});

ConditionNode.displayName = "ConditionNode";

export default ConditionNode;
