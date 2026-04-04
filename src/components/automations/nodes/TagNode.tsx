import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Tag } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TagNodeData {
  label: string;
  action?: "add" | "remove";
  tagName?: string;
}

const TagNode = memo(({ data, selected }: { data: TagNodeData; selected?: boolean }) => {
  return (
    <Card className={`p-3 min-w-[200px] border-2 transition-colors ${selected ? 'border-primary shadow-lg' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
          <Tag className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || "Gerenciar Etiqueta"}</span>
      </div>
      
      {data.tagName && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${data.action === 'add' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {data.action === 'add' ? '+ Adicionar' : '- Remover'}: {data.tagName}
          </span>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
});

TagNode.displayName = "TagNode";

export default TagNode;
