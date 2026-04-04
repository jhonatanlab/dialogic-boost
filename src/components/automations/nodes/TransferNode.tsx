import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";

type TransferNodeData = Node<{
  label: string;
  teamId?: string;
  teamName?: string;
}>;

const TransferNode = memo(({ data, selected }: NodeProps<TransferNodeData>) => {
  return (
    <Card className={`p-3 min-w-[200px] border-2 transition-colors ${selected ? 'border-primary shadow-lg' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-green-500/10 text-green-500">
          <UserPlus className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || "Transferir"}</span>
      </div>
      
      {data.teamName && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          Para: {data.teamName}
        </p>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
});

TransferNode.displayName = "TransferNode";

export default TransferNode;
