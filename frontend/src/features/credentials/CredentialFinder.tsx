import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Search, Sparkles, AlertCircle, Check, Sliders, Cpu, BrainCircuit } from 'lucide-react';
import api from '../../services/api';
import { 
  CategoryResponse, 
  MarketResponse, 
  KPIResponse, 
  CredentialFinderResult 
} from '../../types';

export default function CredentialFinder() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [markets, setMarkets] = useState<MarketResponse[]>([]);
  const [kpis, setKpis] = useState<KPIResponse[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);

  // Selection state
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedMkt, setSelectedMkt] = useState('');
  const [selectedKpi, setSelectedKpi] = useState('');

  // Results state
  const [results, setResults] = useState<CredentialFinderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // AI Explanation State
  // Map project.id -> explanation string
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // Helper to find entity UUID in active tables
  const getEntityId = (type: 'client' | 'brand' | 'category' | 'market' | 'kpi', name: string): string | undefined => {
    let list: { id: string; name: string }[] = [];
    if (type === 'client') list = clients;
    else if (type === 'brand') list = brands;
    else if (type === 'category') list = categories;
    else if (type === 'market') list = markets;
    else if (type === 'kpi') list = kpis;
    return list.find(item => item.name.toLowerCase() === name.toLowerCase())?.id;
  };

  // Load select option dropdown values on mount
  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
    api.get('/markets').then(res => setMarkets(res.data)).catch(() => {});
    api.get('/kpis').then(res => setKpis(res.data)).catch(() => {});
    api.get('/clients').then(res => setClients(res.data)).catch(() => {});
    api.get('/brands').then(res => setBrands(res.data)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);
    setAiExplanations({}); // Clear previous AI text
    setAiLoading({});

    const payload = {
      category_id: selectedCat || null,
      market_id: selectedMkt || null,
      kpi_id: selectedKpi || null
    };

    api.post('/credential-finder', payload)
      .then(res => {
        setResults(res.data.results);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to query matching credentials.');
        setLoading(false);
      });
  };

  const handleReset = () => {
    setSelectedCat('');
    setSelectedMkt('');
    setSelectedKpi('');
    setResults([]);
    setSearched(false);
    setAiExplanations({});
    setAiLoading({});
  };

  const handleGenerateAIExplanation = (res: CredentialFinderResult) => {
    const projectId = res.id;
    setAiLoading(prev => ({ ...prev, [projectId]: true }));
    
    // Resolve target labels
    const catName = categories.find(c => c.id === selectedCat)?.name || "Any Category";
    const mktName = markets.find(m => m.id === selectedMkt)?.name || "Any Market";
    const kpiName = kpis.find(k => k.id === selectedKpi)?.name || "Any KPI";

    const payload = {
      category: catName,
      market: mktName,
      kpi: kpiName,
      project_details: {
        client: res.client,
        brand: res.brand,
        category: res.category,
        market: res.market,
        kpi: res.kpi || "None"
      }
    };

    api.post('/ai/credential-explanation', payload)
      .then(apiRes => {
        const text = apiRes.data.explanation || "No explanation provided.";
        setAiExplanations(prev => ({ ...prev, [projectId]: text }));
        setAiLoading(prev => ({ ...prev, [projectId]: false }));
      })
      .catch(err => {
        const errMsg = err.response?.data?.detail || "AI explanation failed to compile.";
        setAiExplanations(prev => ({ ...prev, [projectId]: errMsg }));
        setAiLoading(prev => ({ ...prev, [projectId]: false }));
      });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-teal-600 bg-teal-50 dark:bg-teal-500/10 border-teal-200/60';
    if (score >= 50) return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200/60';
    return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200/60';
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight font-serif text-foreground">Pitch Credential Matcher</h2>
        <p className="text-xs text-muted-foreground font-semibold mt-1">
          Specify target consumer specifications or pitch criteria to retrieve highly optimized, historically verified engagement profiles.
        </p>
      </div>

      {/* Main split grid */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        
        {/* Form Panel */}
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Pitch Specifications</h3>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            
            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Client Vertical Sector (50% Weight)</label>
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card outline-hidden cursor-pointer"
              >
                <option value="">-- Any Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Market Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Sovereign Target Market (30% Weight)</label>
              <select
                value={selectedMkt}
                onChange={e => setSelectedMkt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card outline-hidden cursor-pointer"
              >
                <option value="">-- Any Market --</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* KPI Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Core Analytical KPI Focus (20% Weight)</label>
              <select
                value={selectedKpi}
                onChange={e => setSelectedKpi(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card outline-hidden cursor-pointer"
              >
                <option value="">-- Any KPI --</option>
                {kpis.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-95 shadow-md cursor-pointer transition-all uppercase tracking-wider"
              >
                <Search className="w-4 h-4" />
                <span>Generate Matches</span>
              </button>
              {searched && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 bg-secondary border border-border text-xs font-bold rounded-lg hover:bg-secondary/85 cursor-pointer transition-all uppercase tracking-wider"
                >
                  Clear
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Results Panel */}
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 bg-muted/30 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-destructive bg-destructive/10 rounded-xl border border-destructive/25 font-bold animate-in fade-in duration-200">
              {error}
            </div>
          ) : !searched ? (
            <div className="glass-panel p-16 rounded-xl text-center text-xs text-muted-foreground font-semibold flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
              <Award className="w-10 h-10 text-primary opacity-60 shrink-0" />
              <div>
                <p>Specify pitch specifications to identify our most rigorous execution patterns and case credentials.</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Credentials processes historical engagements cross-indexed by category relevance, geographic overlap, and modeled KPI variables.</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="glass-panel p-16 rounded-2xl text-center text-xs text-muted-foreground font-semibold animate-in fade-in duration-200">
              No matching credentials found in our historical registry.
            </div>
          ) : (
            
            /* Match Results List */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider px-1">
                <span>Matched Strategy Credentials ({results.length})</span>
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-primary" /> Ranked by credential density</span>
              </div>
              
              <div className="space-y-4">
                {results.map((res, idx) => (
                  <div key={res.id} className="glass-panel p-6 rounded-xl space-y-5 border border-border/80 hover:border-primary/30 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.005]">
                    
                    <div className="flex flex-col md:flex-row gap-6 justify-between">
                      {/* Details */}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[9px] font-bold text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded border border-primary/10 uppercase">
                            Relevance Rank #{idx + 1}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border uppercase">
                            Ref {res.job_number}
                          </span>
                        </div>
                        
                        <div>
                          {getEntityId('client', res.client) ? (
                            <button
                              onClick={() => navigate(`/entity/client/${getEntityId('client', res.client)}`)}
                              className="text-base font-extrabold text-foreground leading-tight font-serif hover:underline hover:text-primary transition-colors cursor-pointer text-left block"
                            >
                              {res.client}
                            </button>
                          ) : (
                            <h4 className="text-base font-extrabold text-foreground leading-tight font-serif">{res.client}</h4>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">Modeled Brand: {getEntityId('brand', res.brand) ? (
                            <button
                              onClick={() => navigate(`/entity/brand/${getEntityId('brand', res.brand)}`)}
                              className="font-bold text-foreground hover:underline hover:text-primary transition-colors cursor-pointer"
                            >
                              {res.brand}
                            </button>
                          ) : (
                            <span className="font-bold text-foreground">{res.brand}</span>
                          )}</p>
                        </div>

                        {/* Pill Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-bold">
                          {getEntityId('category', res.category) ? (
                            <button
                              onClick={() => navigate(`/entity/category/${getEntityId('category', res.category)}`)}
                              className="hover:opacity-80 transition-opacity cursor-pointer text-left block"
                            >
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">{res.category}</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">{res.category}</span>
                          )}

                          {getEntityId('market', res.market) ? (
                            <button
                              onClick={() => navigate(`/entity/market/${getEntityId('market', res.market)}`)}
                              className="hover:opacity-80 transition-opacity cursor-pointer text-left block"
                            >
                              <span className="px-2.5 py-0.5 rounded-full bg-teal-50/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900/50">{res.market}</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900/50">{res.market}</span>
                          )}

                          {res.kpi && getEntityId('kpi', res.kpi) ? (
                            <button
                              onClick={() => navigate(`/entity/kpi/${getEntityId('kpi', res.kpi!)}`)}
                              className="hover:opacity-80 transition-opacity cursor-pointer text-left block"
                            >
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50">{res.kpi}</span>
                            </button>
                          ) : res.kpi ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50">{res.kpi}</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Score and Reasonings column */}
                      <div className="w-full md:w-64 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6 space-y-4">
                        
                        {/* Score Indicator */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alignment Score</span>
                          <span className={`text-xs font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider ${getScoreColor(res.match_score)}`}>
                            {res.match_score}%
                          </span>
                        </div>

                        {/* Reasoning checklists */}
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Reasoning explanation</div>
                          {res.reasoning.map((reason, rIdx) => {
                            const isMatch = reason.startsWith('✓');
                            const isInfo = reason.startsWith('•');
                            
                            return (
                              <div key={rIdx} className="flex items-start gap-1.5 text-[10px] font-semibold">
                                <span className={`shrink-0 font-extrabold text-xs ${isMatch ? 'text-primary' : isInfo ? 'text-muted-foreground/60' : 'text-destructive'}`}>
                                  {isMatch ? '✓' : isInfo ? '•' : '✗'}
                                </span>
                                <span className={isMatch ? 'text-foreground/90' : 'text-muted-foreground/60 font-medium'}>
                                  {reason.substring(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Generate AI Story Trigger Button */}
                        <button
                          onClick={() => handleGenerateAIExplanation(res)}
                          disabled={aiLoading[res.id]}
                          className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg border border-primary/20 hover:border-primary/45 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50 uppercase tracking-wider"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>
                            {aiLoading[res.id] ? "Synthesizing Story..." : "Synthesize Pitch Story"}
                          </span>
                        </button>

                      </div>
                    </div>

                    {/* Explanations slide-down content drawer */}
                    {aiExplanations[res.id] && (
                      <div className="border-t border-border/60 pt-4 mt-2 animate-in slide-in-from-top duration-150">
                        <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-primary uppercase tracking-wider mb-1.5">
                          <BrainCircuit className="w-3.5 h-3.5" />
                          <span>Synthesized Client Pitch Narrative</span>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-foreground/90 p-3 rounded-lg border border-primary/10 bg-primary/5">
                          {aiExplanations[res.id]}
                        </p>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
