import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Building, Tag, Layers, Globe, Activity, TrendingUp, Sparkles, BookOpen, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { NodeDetailResponse } from '../../types';

interface NodeDetailsPanelProps {
  nodeId: string | null;
  onClose: () => void;
  onNavigateNode: (targetNodeId: string) => void;
}

export default function NodeDetailsPanel({ nodeId, onClose, onNavigateNode }: NodeDetailsPanelProps) {
  const navigate = useNavigate();
  const [details, setDetails] = useState<NodeDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!nodeId) return;

    setLoading(true);
    setError('');
    api.get(`/graph/node/${nodeId}`)
      .then(res => {
        setDetails(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch details for this entity.');
        setLoading(false);
      });
  }, [nodeId]);

  if (!nodeId) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLIENT': return <Building className="w-5 h-5 text-slate-500" />;
      case 'BRAND': return <Tag className="w-5 h-5 text-indigo-500" />;
      case 'CATEGORY': return <Layers className="w-5 h-5 text-amber-500" />;
      case 'MARKET': return <Globe className="w-5 h-5 text-teal-500" />;
      case 'KPI': return <Activity className="w-5 h-5 text-rose-500" />;
      default: return null;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'CLIENT': return 'bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80';
      case 'BRAND': return 'bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/50';
      case 'CATEGORY': return 'bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50';
      case 'MARKET': return 'bg-teal-50/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900/50';
      case 'KPI': return 'bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50';
      default: return 'bg-muted text-muted-foreground border border-transparent';
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-2xl flex flex-col z-40 select-none animate-in slide-in-from-right duration-250">
      
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {details ? getTypeIcon(details.type) : null}
          <div>
            <h3 className="text-xs font-bold truncate max-w-[200px]">{details?.name || 'Loading details...'}</h3>
            {details && (
              <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded border mt-0.5 uppercase tracking-wider ${getTypeBadgeClass(details.type)}`}>
                {details.type}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body panel */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-muted rounded-xl" />
            <div className="h-40 bg-muted rounded-xl" />
            <div className="h-40 bg-muted rounded-xl" />
          </div>
        ) : error ? (
          <div className="text-center text-xs text-destructive bg-destructive/10 p-4 border border-destructive/25 rounded-xl">
            {error}
          </div>
        ) : details ? (
          <>
            {/* Action Bar (Navigate to Profile page) */}
            <button
              onClick={() => navigate(`/entity/${details.type.toLowerCase()}/${nodeId.split('_', 2)[1]}`)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold rounded-lg cursor-pointer transition-all"
            >
              <span>View Full Profile Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border bg-secondary/10 text-center">
                <div className="text-xl font-extrabold">{details.project_count}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Projects</div>
              </div>
              <div className="p-3 rounded-xl border border-border bg-secondary/10 text-center">
                <div className="text-xl font-extrabold">{Math.round(details.score)}%</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Expertise Score</div>
              </div>
            </div>

            {/* Top Connected Entities */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span>Top Connections</span>
              </div>
              <div className="space-y-1.5 text-xs font-semibold">
                {details.type !== 'CLIENT' && details.top_clients.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold">Top Clients: </span>
                    <span className="text-foreground">{details.top_clients.join(', ')}</span>
                  </div>
                )}
                {details.type !== 'BRAND' && details.top_brands.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold">Top Brands: </span>
                    <span className="text-foreground">{details.top_brands.join(', ')}</span>
                  </div>
                )}
                {details.type !== 'CATEGORY' && details.top_categories.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold">Top Categories: </span>
                    <span className="text-foreground">{details.top_categories.join(', ')}</span>
                  </div>
                )}
                {details.type !== 'MARKET' && details.top_markets.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold">Top Markets: </span>
                    <span className="text-foreground">{details.top_markets.join(', ')}</span>
                  </div>
                )}
                {details.type !== 'KPI' && details.top_kpis.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold">KPI Metrics: </span>
                    <span className="text-foreground">{details.top_kpis.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Overlap Recommendations Widget */}
            {details.recommendations.length > 0 && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border/80 bg-secondary/15">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Overlap Recommendations</span>
                </div>
                <div className="space-y-2">
                  {details.recommendations.map(rec => (
                    <div 
                      key={rec.id}
                      onClick={() => onNavigateNode(`${rec.type}_${rec.id}`)}
                      className="p-2 rounded-lg border border-border bg-card hover:border-primary/10 hover:bg-secondary/10 transition-all cursor-pointer space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold truncate max-w-[180px]">{rec.name}</span>
                        <span className="text-[8px] font-extrabold px-1 rounded border bg-secondary scale-90 uppercase tracking-wider">{rec.type}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium italic">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent projects list */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Recent Projects ({details.recent_projects.length})</span>
              </div>
              <div className="space-y-2">
                {details.recent_projects.map(proj => (
                  <div key={proj.id} className="p-3 rounded-lg border border-border bg-secondary/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Job {proj.job_number}</span>
                      <span className="text-[9px] font-bold text-muted-foreground">{proj.market}</span>
                    </div>
                    <h5 className="text-[11px] font-extrabold truncate">{proj.client}</h5>
                    <p className="text-[10px] text-muted-foreground truncate">{proj.brand} • {proj.category}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

    </div>
  );
}
