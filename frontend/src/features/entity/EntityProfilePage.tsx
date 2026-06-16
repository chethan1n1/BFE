import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building, 
  Tag, 
  Layers, 
  Globe, 
  Activity, 
  FolderOpen, 
  TrendingUp, 
  Sliders, 
  Sparkles,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Network,
  Cpu,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  ReactFlow, 
  Background, 
  MarkerType,
  Controls
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import api from '../../services/api';
import type { NodeDetailResponse } from '../../types';
import CustomNode from '../graph/CustomNode';

const nodeTypes = {
  CLIENT: CustomNode,
  BRAND: CustomNode,
  CATEGORY: CustomNode,
  MARKET: CustomNode,
  KPI: CustomNode
};

interface AIInsights {
  ai_enabled: boolean;
  summary: string;
  strengths: string[];
  coverage_areas: string[];
  key_relationships: string[];
}

export default function EntityProfilePage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<NodeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // State to hold nodes and edges with user interaction changes
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  // Track dragging and placement changes, similar to the master network explorer page
  const onNodesChange = useCallback((changes: any) => {
    setNodes((prevNodes) => {
      // Direct pass-through mapping
      const updated = [...prevNodes];
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          const idx = updated.findIndex((n) => n.id === change.id);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              position: change.position
            };
          }
        }
      });
      return updated;
    });
  }, []);

  // Mini-graph full screen mode
  const [isMiniGraphFullScreen, setIsMiniGraphFullScreen] = useState(false);

  const loadProfile = useCallback(() => {
    if (!type || !id) return;
    setLoading(true);
    setError('');
    setAiInsights(null);
    setAiError('');
    
    const nodeParam = `${type.toUpperCase()}_${id}`;
    
    // Fetch entity statistics details
    api.get(`/graph/node/${nodeParam}`)
      .then(res => {
        setDetails(res.data);
        setLoading(false);
        
        // Fetch AI insights
        setAiLoading(true);
        api.get(`/ai/entity-insights/${type}/${id}`)
          .then(aiRes => {
            setAiInsights(aiRes.data);
            setAiLoading(false);
          })
          .catch(() => {
            setAiError('Failed to retrieve AI insights.');
            setAiLoading(false);
          });
        
        // Fetch 1st degree connections for the mini-graph
        return api.get(`/graph/related/${nodeParam}`);
      })
      .then(res => {
        if (!res) return;
        const relatedNodes = res.data.nodes;
        const relatedEdges = res.data.edges;
        
        // Multi-ring concentric circular distribution or adaptive bounding-box cluster layout
        // For simple elements we use a small, elegant orbit. For entities with massive connection pools, we cap the spread radius
        // and arrange them in multiple structured layers (rings) to guarantee they always fit nicely in the view frame!
        const centerNodeId = nodeParam;
        const laidNodes: any[] = [];
        
        const outerNodes = relatedNodes.filter((n: any) => n.id !== centerNodeId);
        const centerNodeObj = relatedNodes.find((n: any) => n.id === centerNodeId);

        if (centerNodeObj) {
          laidNodes.push({
            id: centerNodeObj.id,
            type: centerNodeObj.type,
            data: { label: centerNodeObj.label, type: centerNodeObj.type, score: centerNodeObj.score },
            position: { x: 0, y: 0 }
          });
        }

        // Layout parameters that keep everything within comfortable bounds
        const maxCircleRadius = 380;
        
        outerNodes.forEach((node: any, idx: number) => {
          // Concentrate highly connected nodes into concentric orbital rings (up to 12 nodes per ring)
          const ringIndex = Math.floor(idx / 12);
          const indexInRing = idx % 12;
          const totalInRing = Math.min(outerNodes.length - ringIndex * 12, 12);

          // Stagger radii slightly to map rings
          const currentRadius = 160 + ringIndex * 110;
          
          // Equally spaced angles around the specific concentric ring
          const angle = (indexInRing / totalInRing) * 2 * Math.PI + (ringIndex * 0.3); // slighly rotated to prevent overlap
          
          laidNodes.push({
            id: node.id,
            type: node.type,
            data: { label: node.label, type: node.type, score: node.score },
            position: { 
              x: Math.cos(angle) * currentRadius, 
              y: Math.sin(angle) * currentRadius 
            }
          });
        });

        // Use standard hex/rgba colors compatible with all browser SVG specifications to guarantee sharp line rendering!
        const laidEdges = relatedEdges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { strokeWidth: 1.5, stroke: 'rgba(99, 102, 241, 0.5)' },
          type: 'default',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 10,
            height: 10,
            color: '#6366f1'
          }
        }));

        setNodes(laidNodes);
        setEdges(laidEdges);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load profile details for this entity.');
        setLoading(false);
      });
  }, [type, id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const getCorporateTypeName = (t: string) => {
    switch (t) {
      case 'CLIENT': return 'Client Partner';
      case 'BRAND': return 'Modelled Brand';
      case 'CATEGORY': return 'Analytical Category';
      case 'MARKET': return 'Sovereign Market';
      case 'KPI': return 'Performance KPI';
      default: return t;
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'CLIENT': return <Building className="w-6 h-6 text-slate-500" />;
      case 'BRAND': return <Tag className="w-6 h-6 text-indigo-500" />;
      case 'CATEGORY': return <Layers className="w-6 h-6 text-amber-500" />;
      case 'MARKET': return <Globe className="w-6 h-6 text-teal-500" />;
      case 'KPI': return <Activity className="w-6 h-6 text-rose-500" />;
      default: return null;
    }
  };

  const getBadgeClass = (t: string) => {
    switch (t) {
      case 'CLIENT': return 'bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80';
      case 'BRAND': return 'bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/50';
      case 'CATEGORY': return 'bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50';
      case 'MARKET': return 'bg-teal-50/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900/50';
      case 'KPI': return 'bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50';
      default: return 'bg-muted text-muted-foreground border border-transparent';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-6 w-64 bg-muted rounded" />
        <div className="h-20 bg-muted rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="h-[350px] bg-muted rounded-2xl" />
            <div className="h-80 bg-muted rounded-2xl" />
          </div>
          <div className="h-[500px] bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="p-6 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20 font-bold select-none animate-in fade-in duration-200">
        {error || 'Profile details not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      
      {/* Back Button */}
      <div className="flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Hero Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary/50 border border-border rounded-xl">
            {getTypeIcon(details.type)}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight font-serif text-foreground">{details.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeClass(details.type)}`}>
                {getCorporateTypeName(details.type)}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                Capability Depth Index: {Math.round(details.score)}%
              </span>
            </div>
          </div>
        </div>

        {/* Highlight Stats */}
        <div className="flex gap-4">
          <div className="px-4 py-2 border border-border rounded-xl text-center bg-secondary/10">
            <div className="text-2xl font-extrabold text-foreground">{details.project_count}</div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Core Credentials</div>
          </div>
          <div className="px-4 py-2 border border-border rounded-xl text-center bg-secondary/10">
            <div className="text-2xl font-extrabold text-foreground">{Math.round(details.network_strength)}</div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Relational Rank</div>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left Column: Localized Network & Projects */}
        <div className="md:col-span-2 space-y-6">
          
          {/* AI Insights Card */}
          <div className="glass-panel p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary animate-pulse" />
              <h3 className="text-sm font-bold text-foreground">Executive AI Synthesis</h3>
            </div>
            
            {aiLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 bg-muted/30 rounded-xl" />
                <div className="h-6 bg-muted/30 w-3/4 rounded" />
                <div className="h-6 bg-muted/30 w-1/2 rounded" />
              </div>
            ) : aiError ? (
              <p className="text-xs text-muted-foreground italic font-medium">{aiError}</p>
            ) : aiInsights ? (
              !aiInsights.ai_enabled ? (
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-500 text-xs font-semibold leading-relaxed">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <div>
                    <span>Interactive synthesis summary is offline. Configure the `GROQ_API_KEY` on the services node to unlock instant dynamic consulting briefings.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs font-semibold leading-relaxed">
                  <div>
                    <span className="text-[10px] text-foreground font-extrabold uppercase tracking-wider block mb-1">Consulting Assessment Summary</span>
                    <p className="text-foreground/95 font-medium leading-relaxed">{aiInsights.summary}</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 border-t border-border/50 pt-4">
                    <div>
                      <span className="text-[10px] text-foreground font-extrabold uppercase tracking-wider block mb-1">Strategic Strengths</span>
                      <ul className="list-disc pl-4 space-y-1 text-muted-foreground font-semibold">
                        {aiInsights.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] text-foreground font-extrabold uppercase tracking-wider block mb-1">Relational Synergies</span>
                      <ul className="list-disc pl-4 space-y-1 text-muted-foreground font-semibold">
                        {aiInsights.key_relationships.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground italic">No AI insights generated.</p>
            )}
          </div>

          {/* Localized Network Mini-Graph */}
          <div className={`glass-panel rounded-xl overflow-hidden border border-border flex flex-col transition-all duration-300 ${
            isMiniGraphFullScreen 
              ? 'fixed inset-4 z-50 bg-background/98 shadow-2xl backdrop-blur-md' 
              : 'relative'
          }`}>
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/10">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Network className="w-4.5 h-4.5 text-primary" />
                  <span>Capability Network Preview</span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {isMiniGraphFullScreen 
                    ? 'Extended Fullscreen Sandbox • Freely arrange and inspect direct associations' 
                    : 'Visualizing 1st degree adjacent entity associations'}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <span className="text-[9px] px-2 py-0.5 rounded border border-border bg-card font-extrabold text-muted-foreground uppercase select-none">
                  Interactive Canvas
                </span>
                <button
                  onClick={() => setIsMiniGraphFullScreen(!isMiniGraphFullScreen)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
                  title={isMiniGraphFullScreen ? "Minimize network view" : "Maximize network to full screen"}
                >
                  {isMiniGraphFullScreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div className={`${isMiniGraphFullScreen ? 'h-[calc(100vh-80px)]' : 'h-[380px]'} w-full bg-secondary/5 relative transition-all duration-200`}>
              <ReactFlow
                key={`${id}_${isMiniGraphFullScreen}_${nodes.length}`}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                fitView
                fitViewOptions={{ padding: 0.35, includeHiddenNodes: true }}
                minZoom={0.03}
                maxZoom={4}
                zoomOnScroll={true}
                zoomOnPinch={true}
                panOnDrag={true}
                nodesDraggable={true}
                onNodeClick={(_, node) => {
                  // Direct navigation when clicking on a relative inside the mini-graph
                  const cleanType = node.type?.toLowerCase();
                  if (cleanType && node.id) {
                    const rawId = node.id.split('_').slice(1).join('_');
                    if (rawId) {
                      setIsMiniGraphFullScreen(false);
                      navigate(`/entity/${cleanType}/${rawId}`);
                    }
                  }
                }}
              >
                <Background gap={14} size={1} color="rgba(156,163,175,0.08)" />
                <Controls showInteractive={false} className="opacity-95 shadow-lg border border-border bg-card text-foreground" />
              </ReactFlow>
            </div>
          </div>

          {/* Recent projects */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Recent Associated Credentials</h3>
            </div>

            <div className="border border-border/80 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/25 text-muted-foreground font-semibold">
                    <th className="p-3">Credential Ref</th>
                    <th className="p-3">Client Partner</th>
                    <th className="p-3">Brand Modelled</th>
                    <th className="p-3">Analytical Category</th>
                    <th className="p-3">Sovereign Market</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {details.recent_projects.map(proj => (
                    <tr key={proj.id} className="hover:bg-secondary/10 transition-colors font-medium">
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{proj.job_number}</td>
                      <td className="p-3">{proj.client}</td>
                      <td className="p-3">{proj.brand}</td>
                      <td className="p-3">{proj.category}</td>
                      <td className="p-3">{proj.market}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Connection listings & Recommendations */}
        <div className="space-y-6">
          
          {/* Overlap Recommendations */}
          {details.recommendations.length > 0 && (
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold">Strategic Synergy Recommendations</h3>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold">Suggested high-overlap assets to bundle or expand client proposals.</p>
              
              <div className="space-y-2">
                {details.recommendations.map(rec => (
                  <div 
                    key={rec.id}
                    onClick={() => navigate(`/entity/${rec.type.toLowerCase()}/${rec.id}`)}
                    className="p-3.5 rounded-xl border border-border bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40 transition-all cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate max-w-[160px] group-hover:text-primary transition-colors">
                        {rec.name}
                      </span>
                      <span className="text-[8px] font-bold border rounded px-1.5 py-0.5 uppercase bg-card tracking-wider text-muted-foreground font-mono">
                        {getCorporateTypeName(rec.type)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Entities Directory */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Relational Credentials Index</h3>
            </div>
            
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 text-xs">
              
              {details.type !== 'CLIENT' && details.top_clients.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Co-Leveraged Client Partners</div>
                  <div className="flex flex-wrap gap-1">
                    {details.top_clients.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-border/80 bg-secondary/25 font-semibold text-[10px]">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {details.type !== 'BRAND' && details.top_brands.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Brand Portfolios Covered</div>
                  <div className="flex flex-wrap gap-1">
                    {details.top_brands.map((b, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-border/80 bg-secondary/25 font-semibold text-[10px]">{b}</span>
                    ))}
                  </div>
                </div>
              )}

              {details.type !== 'CATEGORY' && details.top_categories.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Strategic Category Domains</div>
                  <div className="flex flex-wrap gap-1">
                    {details.top_categories.map((cat, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-border/80 bg-secondary/25 font-semibold text-[10px]">{cat}</span>
                    ))}
                  </div>
                </div>
              )}

              {details.type !== 'MARKET' && details.top_markets.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sovereign Market Footprints</div>
                  <div className="flex flex-wrap gap-1">
                    {details.top_markets.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-border/80 bg-secondary/25 font-semibold text-[10px]">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {details.type !== 'KPI' && details.top_kpis.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Analytical KPI Frameworks</div>
                  <div className="flex flex-wrap gap-1">
                    {details.top_kpis.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 rounded border border-border/80 bg-secondary/25 font-semibold text-[10px]">{k}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
