import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  Database, 
  ChevronRight, 
  Check, 
  Trash2, 
  Search, 
  ArrowRight, 
  Loader2,
  AlertTriangle,
  RefreshCw,
  GitPullRequest,
  RotateCcw,
  History
} from 'lucide-react';
import api from '../../services/api';

interface DataQualityWarning {
  id: string;
  type: string;
  dimension: string;
  message: string;
  details: string;
  count: number;
  suggested_fix: string | null;
  entities: string[];
}

interface DataQualitySummary {
  health_score: number;
  total_warnings: number;
  warnings: DataQualityWarning[];
}

interface DataMapping {
  id: string;
  dimension: string;
  raw_name: string;
  canonical_name: string;
}

interface CleansingAudit {
  id: string;
  timestamp: string;
  dimension: string;
  action_type: string;
  source_name: string;
  target_name: string;
  affected_project_ids: string;
  undone: boolean;
}

export default function DataQualityPage() {
  const [report, setReport] = useState<DataQualitySummary | null>(null);
  const [mappings, setMappings] = useState<DataMapping[]>([]);
  const [audits, setAudits] = useState<CleansingAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Interactive Merge Modal State
  const [selectedWarning, setSelectedWarning] = useState<DataQualityWarning | null>(null);
  const [canonicalName, setCanonicalName] = useState('');
  const [merging, setMerging] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState('');
  const [mergeSuccess, setMergeSuccess] = useState('');
  
  // Filter active warnings by dimension
  const [activeTab, setActiveTab] = useState<'all' | 'brand' | 'category' | 'market' | 'kpi' | 'client'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQualityData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reportRes, mappingsRes, auditsRes] = await Promise.all([
        api.get('/data-quality'),
        api.get('/data-quality/mappings'),
        api.get('/data-quality/audits')
      ]);
      setReport(reportRes.data);
      setMappings(mappingsRes.data);
      setAudits(auditsRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load data quality reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
  }, []);

  const handleOpenMerge = (warning: DataQualityWarning) => {
    setSelectedWarning(warning);
    setCanonicalName(warning.suggested_fix || warning.entities[0]);
    setMergeError('');
    setMergeSuccess('');
  };

  const handleCloseMerge = () => {
    if (!merging) {
      setSelectedWarning(null);
    }
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarning || !canonicalName.trim()) return;

    setMerging(true);
    setMergeError('');
    setMergeSuccess('');

    // Determine the source name to merge/rename
    // If it's a capitalization warning, we merge the other entities into the canonical one
    const sourceEntities = selectedWarning.entities.filter(
      n => n !== canonicalName.trim()
    );

    // If no other entities (e.g. rename warning), merge the raw name to the canonical name
    const rawToMerge = sourceEntities.length > 0 ? sourceEntities[0] : selectedWarning.entities[0];

    try {
      const response = await api.post('/data-quality/merge', {
        dimension: selectedWarning.dimension,
        raw_name: rawToMerge,
        canonical_name: canonicalName.trim()
      });
      
      setMergeSuccess(response.data.message || 'Successfully resolved!');
      
      // Refresh database records
      setTimeout(async () => {
        await fetchQualityData();
        setSelectedWarning(null);
      }, 1200);
      
    } catch (err: any) {
      console.error(err);
      setMergeError(err.response?.data?.detail || 'Failed to merge entities.');
    } finally {
      setMerging(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this cleansing rule? Re-seeding data will import raw names.')) {
      return;
    }
    try {
      await api.delete(`/data-quality/mappings/${id}`);
      setMappings(prev => prev.filter(m => m.id !== id));
      fetchQualityData();
    } catch (err) {
      alert('Failed to delete mapping rule.');
    }
  };

  const handleUndoCleansing = async (id: string, name: string, type: string) => {
    if (!window.confirm(`Are you sure you want to undo the ${type} for '${name}'? This will revert the naming changes on affected project records.`)) {
      return;
    }
    setUndoingId(id);
    try {
      await api.post(`/data-quality/undo/${id}`);
      fetchQualityData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to revert cleansing action.');
    } finally {
      setUndoingId(null);
    }
  };

  if (loading && !report) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 w-64 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20 font-bold max-w-lg mx-auto mt-20 select-none">
        <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-destructive animate-bounce" />
        <p>{error || 'No report data available.'}</p>
        <button 
          onClick={fetchQualityData}
          className="mt-4 px-4 py-2 bg-destructive text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Retry Scan
        </button>
      </div>
    );
  }

  // Count warning types
  const dupCount = report.warnings.filter(w => w.type === 'duplicate').length;
  const mismatchCount = report.warnings.filter(w => w.type === 'mismatch').length;
  const outlierCount = report.warnings.filter(w => w.type === 'outlier').length;

  // Filter warnings list
  const filteredWarnings = report.warnings.filter(w => {
    const matchesTab = activeTab === 'all' || w.dimension === activeTab;
    const matchesSearch = w.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          w.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          w.entities.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Data Quality & Cleansing Center</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Analyze, normalize, and bucket database fields to ensure strategic reporting accuracy.
          </p>
        </div>
        <button 
          onClick={fetchQualityData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer select-none transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Rescan Database</span>
        </button>
      </div>

      {/* Overview Dashboard Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Quality Score circular indicator */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xs col-span-1 md:col-span-1 border border-border">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Health Index</h3>
            <div className="text-4xl font-black tracking-tighter text-gray-900">{report.health_score}%</div>
            <p className="text-[10px] font-bold text-slate-500 leading-tight">Database integrity score</p>
          </div>
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* SVG circular track */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                stroke="#F1F5F9" 
                strokeWidth="5" 
                fill="transparent" 
              />
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                stroke={report.health_score > 80 ? '#10b981' : report.health_score > 50 ? '#f59e0b' : '#ef4444'} 
                strokeWidth="5" 
                fill="transparent" 
                strokeDasharray={175}
                strokeDashoffset={175 - (175 * report.health_score) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <ShieldAlert className={`w-5 h-5 ${report.health_score > 80 ? 'text-emerald-500' : report.health_score > 50 ? 'text-amber-500' : 'text-rose-500'}`} />
          </div>
        </div>

        {/* Total warnings */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between shadow-xs border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black">{report.total_warnings}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">Issues requiring attention</p>
          </div>
        </div>

        {/* Spelling/Capitalization duplicates */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between shadow-xs border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Duplicates & Spelling</span>
            <GitPullRequest className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-blue-600">{dupCount}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">Variations and suffix typos</p>
          </div>
        </div>

        {/* Dimension mismatches */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between shadow-xs border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Mismatched Classifications</span>
            <Database className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-rose-600">{mismatchCount}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">Cross-dimension violations</p>
          </div>
        </div>

      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Quality warning list */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm border border-border lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-black">Identified Anomalies</h3>
              <p className="text-[11px] text-muted-foreground font-semibold">Active warning log of dirty/unconsolidated entries</p>
            </div>
            
            {/* Search Input */}
            <div className="relative flex items-center bg-gray-50 border border-border rounded-xl px-3 py-1.5 text-xs w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Search warnings..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:outline-none w-full text-xs font-semibold"
              />
            </div>
          </div>

          {/* Dimension Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
            {[
              { id: 'all', label: 'All Warnings' },
              { id: 'brand', label: 'Brands' },
              { id: 'category', label: 'Categories' },
              { id: 'market', label: 'Markets' },
              { id: 'kpi', label: 'KPIs' },
              { id: 'client', label: 'Clients' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none ${
                  activeTab === tab.id 
                    ? 'bg-gray-900 text-white shadow-xs' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List of Warnings */}
          <div className="space-y-4">
            {filteredWarnings.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-gray-900">Database is perfectly clean!</h4>
                <p className="text-[11px] text-muted-foreground font-semibold max-w-xs mx-auto">No formatting issues, case duplications, or classification mismatches detected.</p>
              </div>
            ) : (
              filteredWarnings.map((warning) => (
                <div 
                  key={warning.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-border/80 hover:border-gray-300 rounded-2xl gap-4 transition-all"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        warning.type === 'duplicate' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        warning.type === 'mismatch' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {warning.type}
                      </span>
                      <span className="text-[10px] font-bold text-[#64748b] bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
                        {warning.dimension}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        ({warning.count} projects affected)
                      </span>
                    </div>
                    
                    <h4 className="font-extrabold text-xs text-gray-900 leading-tight">{warning.message}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{warning.details}</p>
                    
                    {/* Entities tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {warning.entities.map(e => (
                        <span key={e} className="px-1.5 py-0.5 bg-white border border-border text-[10px] font-bold text-gray-800 rounded-md">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Resolve Actions Button */}
                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => handleOpenMerge(warning)}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:border-gray-500 text-gray-900 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    >
                      <span>Resolve</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Mapping rules & Audit log */}
        <div className="col-span-1 space-y-6">
          
          {/* Mapping Rules */}
          <div className="glass-panel p-6 rounded-2xl shadow-sm border border-border space-y-6">
            <div>
              <h3 className="text-sm font-black">Mapping & Cleaning Rules</h3>
              <p className="text-[11px] text-muted-foreground font-semibold">Consolidation logic saved from merges</p>
            </div>

            <div className="divide-y divide-border/60 max-h-[300px] overflow-y-auto pr-1">
              {mappings.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-semibold py-8 text-center">No consolidation rules saved yet. Merge duplicates in the left panel to save rules.</p>
              ) : (
                mappings.map(map => (
                  <div key={map.id} className="py-3.5 flex items-center justify-between group">
                    <div className="space-y-1.5 min-w-0 pr-3">
                      <span className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {map.dimension}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-gray-900 min-w-0">
                        <span className="font-medium text-slate-400 truncate max-w-[90px]" title={map.raw_name}>{map.raw_name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-extrabold text-gray-900 truncate max-w-[90px]" title={map.canonical_name}>{map.canonical_name}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteMapping(map.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="Delete mapping rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cleansing Audit */}
          <div className="glass-panel p-6 rounded-2xl shadow-sm border border-border space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <History className="w-4 h-4 text-gray-700" />
                  <span>Cleansing Audit</span>
                </h3>
                <p className="text-[11px] text-muted-foreground font-semibold">History of data merges and renames</p>
              </div>
            </div>

            <div className="divide-y divide-border/60 max-h-[350px] overflow-y-auto pr-1">
              {audits.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-semibold py-8 text-center">No cleansing operations logged yet.</p>
              ) : (
                audits.map(audit => {
                  let projCount = 0;
                  try {
                    const ids = JSON.parse(audit.affected_project_ids);
                    projCount = ids.length;
                  } catch (e) {}

                  return (
                    <div key={audit.id} className="py-3.5 flex items-start justify-between gap-2">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            audit.action_type === 'merge' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {audit.action_type}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            {audit.dimension}
                          </span>
                          {projCount > 0 && (
                            <span className="text-[9px] font-bold text-slate-500">
                              ({projCount} project{projCount > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-900 min-w-0">
                          <span className={`font-semibold truncate max-w-[80px] ${audit.undone ? 'line-through text-slate-400' : 'text-slate-500'}`} title={audit.source_name}>
                            {audit.source_name}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className={`font-extrabold truncate max-w-[80px] text-gray-900 ${audit.undone ? 'text-slate-400' : ''}`} title={audit.target_name}>
                            {audit.target_name}
                          </span>
                        </div>
                        <div className="text-[9px] font-semibold text-slate-400">
                          {new Date(audit.timestamp).toLocaleString()}
                        </div>
                      </div>

                      {audit.undone ? (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md uppercase shrink-0">
                          Undone
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUndoCleansing(audit.id, audit.source_name, audit.action_type)}
                          disabled={undoingId === audit.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-gray-900 hover:bg-slate-100 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          title="Undo cleansing action"
                        >
                          {undoingId === audit.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Merging Modal Overlay */}
      {selectedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] shadow-2xl rounded-2xl max-w-md w-full overflow-hidden p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="space-y-1">
              <h3 className="text-sm font-black flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-blue-500" />
                <span>Resolve Duplicate Entities</span>
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                Consolidate records and permanently link references to a clean name.
              </p>
            </div>

            <form onSubmit={handleMergeSubmit} className="space-y-4">
              
              {/* Alert detail */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Warnings Detected</span>
                <p className="font-bold text-gray-800 leading-normal">{selectedWarning.details}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedWarning.entities.map(e => (
                    <span key={e} className="px-1.5 py-0.5 bg-white border border-blue-100 text-[10px] font-bold text-gray-700 rounded-md">
                      {e}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target / Canonical Name selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-wider block">
                  Select or type the Canonical spelling
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={canonicalName}
                    onChange={(e) => setCanonicalName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-900 rounded-xl text-xs font-semibold focus:outline-none pr-8 text-gray-900"
                  />
                  <div className="absolute right-2.5 top-2.5 text-slate-400">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
                
                {/* Suggestions List */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {selectedWarning.entities.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCanonicalName(option)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer select-none transition-all ${
                        canonicalName === option 
                          ? 'bg-blue-50 border-blue-400 text-blue-600 font-extrabold'
                          : 'bg-gray-50 border-border text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback messages */}
              {mergeError && (
                <div className="p-3 text-xs font-bold text-destructive bg-destructive/10 rounded-xl border border-destructive/20 leading-tight">
                  {mergeError}
                </div>
              )}
              {mergeSuccess && (
                <div className="p-3 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-1.5 leading-tight">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{mergeSuccess}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleCloseMerge}
                  disabled={merging}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={merging || !canonicalName.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {merging ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Merging...</span>
                    </>
                  ) : (
                    <>
                      <span>Merge & Cleanse</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
