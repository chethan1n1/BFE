import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Table as TableIcon, 
  LayoutGrid, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown, 
  Filter, 
  RotateCcw,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { ProjectResponse, ClientResponse, BrandResponse, CategoryResponse, MarketResponse, KPIResponse } from '../../types';

// MultiSelect Dropdown Helper Component
interface MultiSelectProps {
  label: string;
  options: { id: string; name: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

function MultiSelect({ label, options, selectedValues, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const toggleValue = (id: string) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(v => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary/40 text-xs font-semibold select-none cursor-pointer"
      >
        <span>
          {label} {selectedValues.length > 0 ? `(${selectedValues.length})` : ''}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 dropdown-menu border border-border rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto space-y-0.5">
          {options.length === 0 ? (
            <div className="text-center text-[10px] text-muted-foreground p-3">No options available</div>
          ) : (
            options.map(opt => {
              const isSelected = selectedValues.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleValue(opt.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <span className="truncate pr-2">{opt.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown lists
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [categories, setCategoryList] = useState<CategoryResponse[]>([]);
  const [markets, setMarketList] = useState<MarketResponse[]>([]);
  const [kpis, setKpiList] = useState<KPIResponse[]>([]);

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

  // Active filter selections (loaded from URL)
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>([]);

  // Table Pagination & Sorting
  const [page, setPage] = useState(1);
  const [inputPage, setInputPage] = useState('1');
  const [sortBy, setSortBy] = useState('job_number');
  const [sortDesc, setSortDesc] = useState(false);
  const pageSize = 15;

  useEffect(() => {
    setInputPage(page.toString());
  }, [page]);

  // Load dropdown lists on mount
  useEffect(() => {
    api.get('/clients').then(res => setClients(res.data)).catch(() => {});
    api.get('/brands').then(res => setBrands(res.data)).catch(() => {});
    api.get('/categories').then(res => setCategoryList(res.data)).catch(() => {});
    api.get('/markets').then(res => setMarketList(res.data)).catch(() => {});
    api.get('/kpis').then(res => setKpiList(res.data)).catch(() => {});
  }, []);

  // Parse filters from URL on mount & query changes
  useEffect(() => {
    const c = searchParams.get('clients');
    const b = searchParams.get('brands');
    const cat = searchParams.get('categories');
    const m = searchParams.get('markets');
    const k = searchParams.get('kpis');
    const q = searchParams.get('q');

    setSelectedClients(c ? c.split(',') : []);
    setSelectedBrands(b ? b.split(',') : []);
    setSelectedCategories(cat ? cat.split(',') : []);
    setSelectedMarkets(m ? m.split(',') : []);
    setSelectedKPIs(k ? k.split(',') : []);
    setSearchQuery(q || '');
  }, [searchParams]);

  // Apply filters and fetch projects
  useEffect(() => {
    setLoading(true);
    
    // Construct Query String
    const params: any = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort_by: sortBy,
      sort_desc: sortDesc,
    };

    if (selectedClients.length > 0) params.client_ids = selectedClients;
    if (selectedBrands.length > 0) params.brand_ids = selectedBrands;
    if (selectedCategories.length > 0) params.category_ids = selectedCategories;
    if (selectedMarkets.length > 0) params.market_ids = selectedMarkets;
    if (selectedKPIs.length > 0) params.kpi_ids = selectedKPIs;
    if (searchQuery.trim()) params.q = searchQuery;

    api.get('/projects', { params })
      .then(res => {
        setProjects(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [selectedClients, selectedBrands, selectedCategories, selectedMarkets, selectedKPIs, searchQuery, page, sortBy, sortDesc]);

  // Sync state filters back to search URL
  const updateURLFilters = (newFilters: {
    clients?: string[];
    brands?: string[];
    categories?: string[];
    markets?: string[];
    kpis?: string[];
    q?: string;
  }) => {
    const updated = new URLSearchParams(searchParams);
    
    const applyParam = (key: string, list: string[] | undefined) => {
      if (list === undefined) return;
      if (list.length > 0) {
        updated.set(key, list.join(','));
      } else {
        updated.delete(key);
      }
    };

    applyParam('clients', newFilters.clients);
    applyParam('brands', newFilters.brands);
    applyParam('categories', newFilters.categories);
    applyParam('markets', newFilters.markets);
    applyParam('kpis', newFilters.kpis);
    
    if (newFilters.q !== undefined) {
      if (newFilters.q.trim()) {
        updated.set('q', newFilters.q.trim());
      } else {
        updated.delete('q');
      }
    }

    setPage(1); // Reset page on filter change
    setSearchParams(updated);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchQuery('');
    setPage(1);
  };

  const handleExportCSV = () => {
    // Generate filtered URL parameters
    const params = new URLSearchParams();
    if (selectedClients.length > 0) params.set('client_ids', selectedClients.join(','));
    if (selectedBrands.length > 0) params.set('brand_ids', selectedBrands.join(','));
    if (selectedCategories.length > 0) params.set('category_ids', selectedCategories.join(','));
    if (selectedMarkets.length > 0) params.set('market_ids', selectedMarkets.join(','));
    if (selectedKPIs.length > 0) params.set('kpi_ids', selectedKPIs.join(','));
    if (searchQuery.trim()) params.set('q', searchQuery);

    // Call export endpoint
    window.open(`http://localhost:8000/api/projects/export/csv?${params.toString()}&token=${localStorage.getItem('token')}`);
  };

  const toggleSort = (colName: string) => {
    if (sortBy === colName) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(colName);
      setSortDesc(false);
    }
  };

  const renderSortArrow = (colName: string) => {
    if (sortBy !== colName) return null;
    return sortDesc ? <ChevronDown className="w-3.5 h-3.5 inline ml-1" /> : <ChevronUp className="w-3.5 h-3.5 inline ml-1" />;
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      
      {/* Header and export controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight font-serif text-foreground">Credential Repository</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Browse historical analytical engagements, verified expertise evidence, and client success credentials.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border p-1 bg-card">
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${view === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Table Grid View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('card')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${view === 'card' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Metric Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 shadow-md cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="glass-panel p-4 rounded-xl space-y-4 relative z-20">
        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest">
          Credential Dimensions Profile
        </div>
        
        {/* Search bar & filter triggers */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1 w-full">
            
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            
            <MultiSelect
              label="Clients"
              options={clients}
              selectedValues={selectedClients}
              onChange={vals => updateURLFilters({ clients: vals })}
            />
            <MultiSelect
              label="Brands"
              options={brands}
              selectedValues={selectedBrands}
              onChange={vals => updateURLFilters({ brands: vals })}
            />
            <MultiSelect
              label="Categories"
              options={categories}
              selectedValues={selectedCategories}
              onChange={vals => updateURLFilters({ categories: vals })}
            />
            <MultiSelect
              label="Markets"
              options={markets}
              selectedValues={selectedMarkets}
              onChange={vals => updateURLFilters({ markets: vals })}
            />
            <MultiSelect
              label="KPIs"
              options={kpis}
              selectedValues={selectedKPIs}
              onChange={vals => updateURLFilters({ kpis: vals })}
            />

            {(selectedClients.length > 0 || selectedBrands.length > 0 || selectedCategories.length > 0 || selectedMarkets.length > 0 || selectedKPIs.length > 0 || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Quick Input query */}
          <div className="w-full md:w-64 shrink-0">
            <input
              type="text"
              placeholder="Search in table..."
              value={searchQuery}
              onChange={e => updateURLFilters({ q: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-card outline-hidden placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

      </div>

      {/* Dynamic Content Loader */}
      {projects.length === 0 && loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center text-xs text-muted-foreground font-semibold">
          No projects matching the criteria were found.
        </div>
      ) : (
        <div className={`transition-opacity duration-300 relative ${loading ? 'opacity-65 pointer-events-none' : 'opacity-100'}`}>
          {/* Subtle top progress bar during page updates */}
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/10 overflow-hidden z-30 rounded-t-2xl">
              <div className="h-full bg-primary w-1/3 animate-shimmer"></div>
            </div>
          )}

          {view === 'table' ? (
            
            /* Table View */
            <div className="glass-panel rounded-2xl overflow-hidden border border-border/80 relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/35 text-muted-foreground font-bold select-none">
                      <th onClick={() => toggleSort('job_number')} className="p-4 cursor-pointer hover:text-foreground">
                        Credential Ref {renderSortArrow('job_number')}
                      </th>
                      <th onClick={() => toggleSort('client')} className="p-4 cursor-pointer hover:text-foreground">
                        Client Partner {renderSortArrow('client')}
                      </th>
                      <th onClick={() => toggleSort('brand')} className="p-4 cursor-pointer hover:text-foreground">
                        Modeled Brand {renderSortArrow('brand')}
                      </th>
                      <th onClick={() => toggleSort('category')} className="p-4 cursor-pointer hover:text-foreground">
                        Category Area {renderSortArrow('category')}
                      </th>
                      <th onClick={() => toggleSort('market')} className="p-4 cursor-pointer hover:text-foreground">
                        Geographic Market {renderSortArrow('market')}
                      </th>
                      <th onClick={() => toggleSort('kpi')} className="p-4 cursor-pointer hover:text-foreground">
                        Analytical KPI Frame {renderSortArrow('kpi')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {projects.map(p => (
                      <tr key={p.id} className="hover:bg-secondary/20 font-semibold transition-colors">
                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300">#{p.job_number}</td>
                        
                        <td className="p-4">
                          {getEntityId('client', p.client) ? (
                            <button
                              onClick={() => navigate(`/entity/client/${getEntityId('client', p.client)}`)}
                              className="hover:underline hover:text-primary text-foreground text-left font-bold transition-colors cursor-pointer"
                            >
                              {p.client}
                            </button>
                          ) : (
                            <span className="text-foreground">{p.client}</span>
                          )}
                        </td>

                        <td className="p-4">
                          {getEntityId('brand', p.brand) ? (
                            <button
                              onClick={() => navigate(`/entity/brand/${getEntityId('brand', p.brand)}`)}
                              className="hover:underline hover:text-primary text-foreground/80 text-left font-semibold transition-colors cursor-pointer"
                            >
                              {p.brand}
                            </button>
                          ) : (
                            <span className="text-foreground/85">{p.brand}</span>
                          )}
                        </td>

                        <td className="p-4">
                          {getEntityId('category', p.category) ? (
                            <button
                              onClick={() => navigate(`/entity/category/${getEntityId('category', p.category)}`)}
                              className="hover:opacity-80 transition-opacity cursor-pointer text-left block"
                            >
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 text-[10px] font-bold">{p.category}</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 text-[10px] font-bold">{p.category}</span>
                          )}
                        </td>

                        <td className="p-4">
                          {getEntityId('market', p.market) ? (
                            <button
                              onClick={() => navigate(`/entity/market/${getEntityId('market', p.market)}`)}
                              className="hover:opacity-80 transition-opacity cursor-pointer text-left block"
                            >
                              <span className="px-2.5 py-0.5 rounded-full bg-teal-50/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900/50 text-[10px] font-bold">{p.market}</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900/50 text-[10px] font-bold">{p.market}</span>
                          )}
                        </td>

                        <td className="p-4">
                          {p.kpi && getEntityId('kpi', p.kpi) ? (
                            <button
                              onClick={() => navigate(`/entity/kpi/${getEntityId('kpi', p.kpi!)}`)}
                              className="hover:opacity-80 transition-opacity cursor-pointer text-left block"
                            >
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50 text-[10px] font-bold">{p.kpi}</span>
                            </button>
                          ) : p.kpi ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50 text-[10px] font-bold">{p.kpi}</span>
                          ) : (
                            <span className="text-muted-foreground/60 italic font-normal">None Specified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            
            /* Card View */
            <div className="grid md:grid-cols-3 gap-4 relative z-10">
              {projects.map(p => (
                <div key={p.id} className="glass-panel p-6 rounded-xl space-y-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 uppercase">
                      Ref #{p.job_number}
                    </span>

                    {getEntityId('market', p.market) ? (
                      <button
                        onClick={() => navigate(`/entity/market/${getEntityId('market', p.market)}`)}
                        className="text-[10px] font-bold text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer"
                      >
                        {p.market}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground">{p.market}</span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {getEntityId('client', p.client) ? (
                      <button
                        onClick={() => navigate(`/entity/client/${getEntityId('client', p.client)}`)}
                        className="text-sm font-extrabold text-foreground hover:underline hover:text-primary transition-colors cursor-pointer text-left block"
                      >
                        {p.client}
                      </button>
                    ) : (
                      <h4 className="text-sm font-extrabold text-foreground">{p.client}</h4>
                    )}

                    {getEntityId('brand', p.brand) ? (
                      <button
                        onClick={() => navigate(`/entity/brand/${getEntityId('brand', p.brand)}`)}
                        className="text-xs text-muted-foreground hover:underline hover:text-primary transition-colors cursor-pointer text-left block"
                      >
                        {p.brand}
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {getEntityId('category', p.category) ? (
                      <button
                        onClick={() => navigate(`/entity/category/${getEntityId('category', p.category)}`)}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 text-[10px] font-bold">{p.category}</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 text-[10px] font-bold">{p.category}</span>
                    )}

                    {p.kpi && getEntityId('kpi', p.kpi) ? (
                      <button
                        onClick={() => navigate(`/entity/kpi/${getEntityId('kpi', p.kpi!)}`)}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50 text-[10px] font-bold">{p.kpi}</span>
                      </button>
                    ) : p.kpi ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50 text-[10px] font-bold">{p.kpi}</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 border border-border text-[10px] font-bold">No KPI Target</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination controls */}
      {(projects.length > 0 || page > 1) && (
        <div className="flex items-center justify-between pt-4 select-none">
          <p className="text-[11px] text-muted-foreground font-semibold">
            Showing records for page {page}
          </p>
          <div className="flex gap-2 items-center md:mr-16">
            {/* Direct Page Navigation Input Box */}
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-[11px] text-muted-foreground font-semibold">Page</span>
              <input
                type="text"
                value={inputPage}
                onChange={(e) => {
                  const valStr = e.target.value;
                  const sanitized = valStr.replace(/\D/g, '');
                  setInputPage(sanitized);
                  const val = parseInt(sanitized, 10);
                  if (!isNaN(val) && val >= 1) {
                    setPage(val);
                  }
                }}
                className="w-12 px-2 py-1 text-xs text-center border border-border bg-card rounded-lg font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-hidden"
              />
            </div>

            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-border bg-card hover:bg-secondary/40 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={projects.length < pageSize}
              className="flex items-center gap-1 px-3 py-1.5 border border-border bg-card hover:bg-secondary/40 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
