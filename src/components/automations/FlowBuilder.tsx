import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  addEdge,
  type Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import MessageNode from "./nodes/MessageNode";
import QuestionNode from "./nodes/QuestionNode";
import TagNode from "./nodes/TagNode";
import TransferNode from "./nodes/TransferNode";
import AIAgentNode from "./nodes/AIAgentNode";
import TriggerNode from "./nodes/TriggerNode";
import ConditionNode from "./nodes/ConditionNode";
import DelayNode from "./nodes/DelayNode";
import { FlowSidebar } from "./FlowSidebar";
import { NodeConfigPanel } from "./NodeConfigPanel";

const nodeTypes = {
  message: MessageNode,
  question: QuestionNode,
  tag: TagNode,
  transfer: TransferNode,
  aiAgent: AIAgentNode,
  trigger: TriggerNode,
  condition: ConditionNode,
  delay: DelayNode,
};

const initialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 250, y: 50 },
    data: { label: "Início", triggerType: "first_message" },
  },
];

const initialEdges: Edge[] = [];

interface FlowBuilderProps {
  flowId?: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

let id = 0;
const getId = () => `node_${id++}`;

function FlowBuilderInner({ flowId, onSave }: FlowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(var(--primary))' } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const defaultLabels: Record<string, string> = {
        trigger: "Gatilho",
        message: "Enviar Mensagem",
        question: "Fazer Pergunta",
        delay: "Aguardar",
        condition: "Condição",
        tag: "Gerenciar Etiqueta",
        transfer: "Transferir",
        aiAgent: "Agente IA",
      };

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { label: defaultLabels[type] || type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleSave = useCallback(() => {
    const flowData = { nodes, edges };
    console.log("Flow JSON:", JSON.stringify(flowData, null, 2));
    onSave?.(nodes, edges);
  }, [nodes, edges, onSave]);

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden bg-background">
      <FlowSidebar />
      
      <div className="flex-1" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-muted/30"
        >
          <Controls className="!bg-card !border-border !shadow-md" />
          <MiniMap 
            className="!bg-card !border-border" 
            nodeColor="hsl(var(--primary))"
            maskColor="hsl(var(--background) / 0.8)"
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.3)" />
        </ReactFlow>
      </div>
      
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleNodeUpdate}
        />
      )}
    </div>
  );
}

export function FlowBuilder(props: FlowBuilderProps) {
  return <FlowBuilderInner {...props} />;
}

export function FlowBuilderWrapper(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

export { type FlowBuilderProps };
