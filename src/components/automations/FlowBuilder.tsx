import { useCallback, useState, useRef, useImperativeHandle, forwardRef } from "react";
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

const defaultInitialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 250, y: 50 },
    data: { label: "Início", triggerType: "first_message" },
  },
];

export interface FlowBuilderProps {
  flowId?: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  initialFlowData?: { nodes: Node[]; edges: Edge[] };
}

export interface FlowBuilderHandle {
  save: () => void;
  getFlowData: () => { nodes: Node[]; edges: Edge[] };
}

let id = 0;
const getId = () => `node_${id++}`;

const FlowBuilderInner = forwardRef<FlowBuilderHandle, FlowBuilderProps>(({ flowId, onSave, initialFlowData }, ref) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlowData?.nodes?.length ? initialFlowData.nodes : defaultInitialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowData?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  useImperativeHandle(ref, () => ({
    save: () => {
      const flowData = { nodes, edges };
      console.log("Flow JSON:", JSON.stringify(flowData, null, 2));
      onSave?.(nodes, edges);
    },
    getFlowData: () => ({ nodes, edges }),
  }), [nodes, edges, onSave]);

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
      if (!type) return;

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

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const deletedIds = new Set(deleted.map((n) => n.id));
    setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
    if (selectedNode && deletedIds.has(selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [setEdges, selectedNode]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  }, [setNodes, setEdges, selectedNode]);

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
          onNodesDelete={onNodesDelete}
          nodeTypes={nodeTypes}
          deleteKeyCode={["Backspace", "Delete"]}
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
});

FlowBuilderInner.displayName = "FlowBuilderInner";

export function FlowBuilderWrapper({ flowId, onSave, builderRef, initialFlowData }: FlowBuilderProps & { builderRef?: React.Ref<FlowBuilderHandle> }) {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner ref={builderRef} flowId={flowId} onSave={onSave} initialFlowData={initialFlowData} />
    </ReactFlowProvider>
  );
}
