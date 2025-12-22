import { 
  MessageSquare, 
  HelpCircle, 
  Tag, 
  UserPlus, 
  Bot, 
  Zap,
  GitBranch,
  Clock,
  Image,
  FileText
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BlockItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

const blocks: BlockItem[] = [
  { 
    type: "trigger", 
    label: "Gatilho", 
    icon: <Zap className="h-4 w-4" />, 
    color: "bg-primary/10 text-primary border-primary/30",
    category: "Início"
  },
  { 
    type: "message", 
    label: "Enviar Mensagem", 
    icon: <MessageSquare className="h-4 w-4" />, 
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    category: "Mensagens"
  },
  { 
    type: "question", 
    label: "Fazer Pergunta", 
    icon: <HelpCircle className="h-4 w-4" />, 
    color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    category: "Mensagens"
  },
  { 
    type: "delay", 
    label: "Aguardar", 
    icon: <Clock className="h-4 w-4" />, 
    color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    category: "Controle"
  },
  { 
    type: "condition", 
    label: "Condição", 
    icon: <GitBranch className="h-4 w-4" />, 
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    category: "Controle"
  },
  { 
    type: "tag", 
    label: "Gerenciar Etiqueta", 
    icon: <Tag className="h-4 w-4" />, 
    color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    category: "Ações"
  },
  { 
    type: "transfer", 
    label: "Transferir", 
    icon: <UserPlus className="h-4 w-4" />, 
    color: "bg-green-500/10 text-green-500 border-green-500/30",
    category: "Ações"
  },
  { 
    type: "aiAgent", 
    label: "Agente IA", 
    icon: <Bot className="h-4 w-4" />, 
    color: "bg-violet-500/10 text-violet-500 border-violet-500/30",
    category: "Inteligência"
  },
];

const categories = ["Início", "Mensagens", "Controle", "Ações", "Inteligência"];

const onDragStart = (event: React.DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

export function FlowSidebar() {
  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Blocos de Ação</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste e solte no canvas
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                {category}
              </h4>
              <div className="space-y-2">
                {blocks
                  .filter((block) => block.category === category)
                  .map((block) => (
                    <Card
                      key={block.type}
                      className={`p-3 cursor-grab active:cursor-grabbing border-2 ${block.color} hover:shadow-md transition-all`}
                      draggable
                      onDragStart={(e) => onDragStart(e, block.type)}
                    >
                      <div className="flex items-center gap-2">
                        {block.icon}
                        <span className="text-sm font-medium">{block.label}</span>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
