import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Search, Network, Sliders, Maximize, AlertCircle, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import CustomNode from './CustomNode';
import NodeDetailsPanel from './NodeDetailsPanel';
import { GraphNode, GraphEdge } from '../../types';
import { useUIStore } from '../../store/uiStore';

// Node Types Registry
const nodeTypes = {
  CLIENT: CustomNode,
  BRAND: CustomNode,
  CATEGORY: CustomNode,
  MARKET: CustomNode,
  KPI: CustomNode
};

function FlowCanvas() {
  const { fitView, zoomTo, setCenter } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Drawer state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Auto-dismissing instructions layout
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInstructions(false);
    }, 6000); // fade out after 6 seconds
    return () => clearTimeout(timer);
  }, []);

  // Position Calculator (Column-based deterministic layout)
  const layoutNodes = useCallback((rawNodes: GraphNode[], rawEdges: GraphEdge[]) => {
    const colSpacing = 280;
    const rowSpacing = 90;
    
    // Categorize nodes by type
    const columns: Record<string, GraphNode[]> = {
      'CLIENT': [],
      'BRAND': [],
      'CATEGORY': [],
      'MARKET': [],
      'KPI': []
    };
    
    rawNodes.forEach(node => {
      if (columns[node.type]) {
        columns[node.type].push(node);
      }
    });

    const xMap = {
      'CLIENT': 0,
      'BRAND': colSpacing,
      'CATEGORY': colSpacing * 2,
      'MARKET': colSpacing * 3,
      'KPI': colSpacing * 4
    };

    const laidNodes: any[] = [];
    
    // Position nodes vertically centered
    Object.entries(columns).forEach(([type, nodeList]) => {
      const x = xMap[type as keyof typeof xMap];
      const totalHeight = (nodeList.length - 1) * rowSpacing;
      const yStart = -totalHeight / 2;
      
      nodeList.forEach((node, idx) => {
        laidNodes.push({
          id: node.id,
          type: node.type,
          data: { label: node.label, type: node.type, score: node.score },
          position: { x, y: yStart + (idx * rowSpacing) }
        });
      });
    });

    // Map edges to React Flow layout
    const laidEdges = rawEdges.map(edge => {
      // Determine thickness based on strength weight
      const strokeWidth = Math.min(Math.max(edge.weight * 1.5, 1), 6);
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.weight > 3,
        style: { strokeWidth, stroke: 'rgba(156, 163, 175, 0.45)' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: 'rgba(156, 163, 175, 0.45)'
        }
      };
    });

    return { laidNodes, laidEdges };
  }, []);

  // Fetch initial graph
  const loadInitialGraph = useCallback(() => {
    setLoading(true);
    api.get('/graph')
      .then(res => {
        const { laidNodes, laidEdges } = layoutNodes(res.data.nodes, res.data.edges);
        setNodes(laidNodes);
        setEdges(laidEdges);
        setLoading(false);
        setError('');
        // Fit view after small delay to let canvas render
        setTimeout(() => fitView({ padding: 0.15 }), 150);
      })
      .catch(err => {
        setError('Failed to fetch capability graph network.');
        setLoading(false);
      });
  }, [layoutNodes, setNodes, setEdges, fitView]);

  useEffect(() => {
    loadInitialGraph();
  }, [loadInitialGraph]);

  // Click handler to select node and open details drawer
  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  // Double Click handler for Progressive expansion (loading adjacent nodes)
  const onNodeDoubleClick = useCallback((_: any, node: any) => {
    api.get(`/graph/related/${node.id}`)
      .then(res => {
        const newNodes: GraphNode[] = res.data.nodes;
        const newEdges: GraphEdge[] = res.data.edges;
        
        setNodes(prevNodes => {
          // Merge nodes avoiding duplicates
          const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
          
          newNodes.forEach((n, idx) => {
            if (!nodeMap.has(n.id)) {
              // Calculate offset position close to the source node
              const angle = (idx / newNodes.length) * 2 * Math.PI;
              const radius = 180;
              const posX = node.position.x + Math.cos(angle) * radius;
              const posY = node.position.y + Math.sin(angle) * radius;
              
              nodeMap.set(n.id, {
                id: n.id,
                type: n.type,
                data: { label: n.label, type: n.type, score: n.score },
                position: { x: posX, y: posY }
              });
            }
          });
          return Array.from(nodeMap.values());
        });

        setEdges(prevEdges => {
          // Merge edges
          const edgeMap = new Map(prevEdges.map(e => [e.id, e]));
          newEdges.forEach(e => {
            const edgeId = e.id;
            if (!edgeMap.has(edgeId)) {
              const strokeWidth = Math.min(Math.max(e.weight * 1.5, 1), 6);
              edgeMap.set(edgeId, {
                id: edgeId,
                source: e.source,
                target: e.target,
                animated: true,
                style: { strokeWidth, stroke: 'rgba(99, 102, 241, 0.6)' },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 14,
                  height: 14,
                  color: 'rgba(99, 102, 241, 0.6)'
                }
              });
            }
          });
          return Array.from(edgeMap.values());
        });
      })
      .catch(() => {});
  }, [setNodes, setEdges]);

  // Navigate directly to a node (called from drawer or global commands)
  const handleNavigateNode = (targetNodeId: string) => {
    setSelectedNodeId(targetNodeId);
    
    // Find node coordinates to center camera
    const nodeObj = nodes.find(n => n.id === targetNodeId);
    if (nodeObj) {
      setCenter(nodeObj.position.x, nodeObj.position.y, { zoom: 1.2, duration: 800 });
    } else {
      // If node is not currently in layout, load related and focus
      api.get(`/graph/related/${targetNodeId}`)
        .then(res => {
          // Append nodes and focus
          onNodeDoubleClick(null, { id: targetNodeId, position: { x: 200, y: 200 } });
          setTimeout(() => {
            const added = nodes.find(n => n.id === targetNodeId);
            if (added) {
              setCenter(added.position.x, added.position.y, { zoom: 1.2, duration: 800 });
            }
          }, 300);
        });
    }
  };

  // Search filter for nodes inside the viewport
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const clean = val.toLowerCase();
    const matches = nodes.filter(n => n.data.label.toLowerCase().includes(clean));
    setSearchResults(matches.slice(0, 5));
    setShowSearchResults(true);
  };

  const handleSelectSearchResult = (node: any) => {
    setSearchQuery(node.data.label);
    setShowSearchResults(false);
    handleNavigateNode(node.id);
  };

  const handleResetGraph = () => {
    setSelectedNodeId(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    loadInitialGraph();
  };

  if (loading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center bg-card rounded-xl border border-border">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase animate-pulse">Loading Graph Network...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20 font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="h-[82vh] w-full rounded-2xl border border-border bg-card overflow-hidden relative flex flex-col">
      
      {/* Node Search overlay */}
      <div className="absolute top-4 left-4 z-10 w-72 shrink-0">
        <div className="relative">
          <div className="absolute left-3 top-2 text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search and center node..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-border bg-card shadow-lg outline-hidden placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 dropdown-menu border border-border rounded-lg shadow-2xl p-1 z-30 max-h-52 overflow-y-auto space-y-0.5">
              {searchResults.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleSelectSearchResult(n)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold hover:bg-secondary cursor-pointer transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{n.data.label}</span>
                  <span className="text-[8px] font-bold border rounded px-1 uppercase opacity-75">{n.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
        <div className="bg-card/90 px-3 py-2.5 rounded-xl border border-border text-[10px] font-bold flex flex-col gap-1.5 shadow-sm min-w-[100px] select-none">
          <div className="flex items-center justify-between border-b border-border/50 pb-1 mb-0.5 gap-3">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Legend</span>
            <button
              onClick={handleResetGraph}
              className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
              title="Reset graph to default layout"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500/80 dark:bg-slate-400/80 border border-slate-600/30 shrink-0" />
              <span className="text-foreground/90">Client</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/80 dark:bg-indigo-400/80 border border-indigo-600/30 shrink-0" />
              <span className="text-foreground/90">Brand</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 dark:bg-amber-400/80 border border-amber-600/30 shrink-0" />
              <span className="text-foreground/90">Category</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500/80 dark:bg-teal-400/80 border border-teal-600/30 shrink-0" />
              <span className="text-foreground/90">Market</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 dark:bg-rose-400/80 border border-rose-600/30 shrink-0" />
              <span className="text-foreground/90">KPI Metric</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Instructions Banner */}
      {showInstructions && (
        <div className="absolute bottom-4 left-4 z-10 bg-card/90 px-3.5 py-2 rounded-xl border border-border text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 shadow-sm animate-out fade-out delay-5000 duration-1000">
          <AlertCircle className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>Double-click node to expand relationships. Drag or Scroll to zoom.</span>
        </div>
      )}

      {/* React Flow Board */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.03}
        maxZoom={4}
      >
        <Background gap={16} size={1} color="rgba(156,163,175,0.1)" />
        <Controls showInteractive={false} />
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'CLIENT') return '#1e3a8a';
            if (n.type === 'BRAND') return '#2563eb';
            if (n.type === 'CATEGORY') return '#3b82f6';
            if (n.type === 'MARKET') return '#60a5fa';
            if (n.type === 'KPI') return '#93c5fd';
            return '#cbd5e1';
          }}
          maskColor="rgba(240, 240, 240, 0.05)"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
        />
      </ReactFlow>

      {/* Slide drawer node details panel */}
      <NodeDetailsPanel
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
        onNavigateNode={handleNavigateNode}
      />

    </div>
  );
}

export default function RelationshipExplorer() {
  const { togglePresentationMode } = useUIStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight font-serif text-foreground">Capability Network</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Explore how Kantar experience connects clients, brands, markets, categories, and KPI frameworks.
          </p>
        </div>
        
        <button
          onClick={togglePresentationMode}
          className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg hover:bg-amber-500/20 shadow-xs cursor-pointer transition-all uppercase tracking-wider select-none"
        >
          <Maximize className="w-3.5 h-3.5" />
          <span>Client Presentation Mode</span>
        </button>
      </div>

      {/* Executive Explanation Panel */}
      <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-start gap-3">
        <Network className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-foreground font-bold">Executive Experience Summary</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 font-semibold">
            This network represents the breadth of Kantar's analytical experience and credential footprint. Double-click any node to progressively explore adjacent client, brand, market, category, and KPI targets.
          </p>
        </div>
      </div>

      {/* Provider Wrapper */}
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>

    </div>
  );
}
