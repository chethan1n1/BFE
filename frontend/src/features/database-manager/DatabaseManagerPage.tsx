import React, { useEffect, useState } from 'react';
import {
  FolderOpen,
  Building,
  Tag,
  Globe,
  Layers,
  Activity,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  X
} from 'lucide-react';
import api from '../../services/api';
import { ProjectResponse, ClientResponse, BrandResponse, CategoryResponse, MarketResponse, KPIResponse } from '../../types';

export default function DatabaseManagerPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lists for drop downs
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [markets, setMarkets] = useState<MarketResponse[]>([]);
  const [kpis, setKpis] = useState<KPIResponse[]>([]);

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [inputPage, setInputPage] = useState('1');
  const pageSize = 15;

  // Add/Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null); // null means adding new
  const [modalError, setModalError] = useState('');

  // Form values
  const [jobNumVal, setJobNumVal] = useState('');
  const [clientVal, setClientVal] = useState('');
  const [brandVal, setBrandVal] = useState('');
  const [categoryVal, setCategoryVal] = useState('');
  const [marketVal, setMarketVal] = useState('');
  const [kpiVal, setKpiVal] = useState('');

  const fetchLists = async () => {
    try {
      const [clientsRes, brandsRes, categoriesRes, marketsRes, kpisRes] = await Promise.all([
        api.get('/clients'),
        api.get('/brands'),
        api.get('/categories'),
        api.get('/markets'),
        api.get('/kpis')
      ]);
      setClients(clientsRes.data);
      setBrands(brandsRes.data);
      setCategories(categoriesRes.data);
      setMarkets(marketsRes.data);
      setKpis(kpisRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError('');

    const params: any = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort_by: 'job_number',
      sort_desc: false
    };

    if (searchQuery.trim()) params.q = searchQuery;
    if (selectedCategory) params.category_ids = [selectedCategory];
    if (selectedMarket) params.market_ids = [selectedMarket];

    try {
      const res = await api.get('/projects', { params });
      setProjects(res.data);
    } catch (err) {
      setError('Failed to fetch projects database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [page, searchQuery, selectedCategory, selectedMarket]);

  useEffect(() => {
    setInputPage(page.toString());
  }, [page]);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setJobNumVal('');
    setClientVal('');
    setBrandVal('');
    setCategoryVal('');
    setMarketVal('');
    setKpiVal('');
    setModalError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProjectResponse) => {
    setEditingProject(p);
    setJobNumVal(p.job_number);
    setClientVal(p.client || '');
    setBrandVal(p.brand || '');
    setCategoryVal(p.category || '');
    setMarketVal(p.market || '');
    setKpiVal(p.kpi || '');
    setModalError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNumVal.trim() || !clientVal.trim() || !brandVal.trim() || !categoryVal.trim() || !marketVal.trim()) {
      setModalError('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    const payload = {
      job_number: jobNumVal.trim(),
      client: clientVal.trim(),
      brand: brandVal.trim(),
      category: categoryVal.trim(),
      market: marketVal.trim(),
      kpi: kpiVal.trim() || null
    };

    try {
      if (editingProject) {
        // Edit API call
        await api.put(`/projects/${editingProject.id}`, payload);
      } else {
        // Create API call
        await api.post('/projects', payload);
      }
      setModalOpen(false);
      fetchProjects();
      fetchLists(); // Refresh lists in case new dimensions were created
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to save credential.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, jobNum: string) => {
    if (!window.confirm(`Are you sure you want to delete credential #${jobNum}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err) {
      alert('Failed to delete project record.');
    }
  };

  return (
    <div className="space-y-8 pb-12 select-none animate-in fade-in duration-200">

      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Database Manager</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Directly create, update, and delete project entries in the Capability Explorer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProjects}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-slate-500 hover:text-foreground cursor-pointer transition-colors"
            title="Refresh database view"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer select-none transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credential</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center relative z-20 border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

        {/* Search Input */}
        <div className="relative flex items-center bg-[#F8FAFC] border border-border rounded-xl px-3 py-2 text-xs w-full md:flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by job number, client, brand, KPI..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="bg-transparent border-none focus:outline-none w-full text-xs font-semibold placeholder:text-slate-400 text-gray-900"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2.5 bg-card border border-border rounded-xl text-xs font-semibold focus:outline-none text-slate-600 cursor-pointer w-full sm:w-48"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedMarket}
            onChange={(e) => {
              setSelectedMarket(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2.5 bg-card border border-border rounded-xl text-xs font-semibold focus:outline-none text-slate-600 cursor-pointer w-full sm:w-48"
          >
            <option value="">All Markets</option>
            {markets.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table grid area */}
      {projects.length === 0 && loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center text-xs text-muted-foreground font-semibold border border-border/80">
          No project records match the current criteria.
        </div>
      ) : (
        <div className={`transition-all duration-300 relative ${loading ? 'opacity-65 pointer-events-none' : 'opacity-100'}`}>

          <div className="glass-panel rounded-2xl overflow-hidden border border-border/80 relative z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-text">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 text-slate-400 font-bold select-none uppercase tracking-wide text-[10px]">
                    <th className="p-4 w-14 text-center">Row</th>
                    <th className="p-4">Ref #</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Brand</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Market</th>
                    <th className="p-4">KPI</th>
                    <th className="p-4 w-24 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {projects.map((p, idx) => {
                    const rowNum = (page - 1) * pageSize + idx + 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/45 font-semibold transition-colors">
                        <td className="p-4 text-center text-slate-400 font-bold">{rowNum}</td>
                        <td className="p-4 font-bold text-slate-800">#{p.job_number}</td>
                        <td className="p-4 text-gray-900">{p.client}</td>
                        <td className="p-4 text-gray-700">{p.brand}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50/50 text-amber-700 border border-amber-200/60 text-[10px] font-bold">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-50/50 text-teal-700 border border-teal-200/60 text-[10px] font-bold">
                            {p.market}
                          </span>
                        </td>
                        <td className="p-4">
                          {p.kpi ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50/50 text-rose-700 border border-rose-200/60 text-[10px] font-bold">
                              {p.kpi}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">None</span>
                          )}
                        </td>
                        <td className="p-4 text-center flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-gray-900 hover:bg-slate-100 transition-all cursor-pointer"
                            title="Edit project"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(p.id, p.job_number)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 select-none">
            <p className="text-[11px] text-muted-foreground font-semibold">
              Showing page {page} of project records
            </p>
            <div className="flex gap-2 items-center">

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
                className="flex items-center gap-1 px-3 py-1.5 border border-border bg-card hover:bg-slate-50 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={projects.length < pageSize}
                className="flex items-center gap-1 px-3 py-1.5 border border-border bg-card hover:bg-slate-50 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>
          </div>

        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] shadow-2xl rounded-2xl max-w-md w-full overflow-hidden p-6 space-y-5">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-700" />
                <span>{editingProject ? 'Edit Credential' : 'Add New Credential'}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">

              {/* Job number */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-wider block">Job Number (Ref)</label>
                <input
                  type="text"
                  value={jobNumVal}
                  onChange={(e) => setJobNumVal(e.target.value)}
                  placeholder="e.g. 155405635"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-900 rounded-xl text-xs font-semibold focus:outline-none text-gray-900 placeholder:text-slate-400"
                />
              </div>

              {/* Client selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-wider block">Client Partner</label>
                <input
                  type="text"
                  list="client-options"
                  value={clientVal}
                  onChange={(e) => setClientVal(e.target.value)}
                  required
                  placeholder="Type a client"
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-900 rounded-xl text-xs font-semibold focus:outline-none text-gray-900 placeholder:text-slate-400"
                />
                <datalist id="client-options">
                  {clients.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              {/* Brand selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-wider block">Brand Modelled</label>
                <input
                  type="text"
                  list="brand-options"
                  value={brandVal}
                  onChange={(e) => setBrandVal(e.target.value)}
                  required
                  placeholder="Type a brand"
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-900 rounded-xl text-xs font-semibold focus:outline-none text-gray-900 placeholder:text-slate-400"
                />
                <datalist id="brand-options">
                  {brands.map(b => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </div>

              {/* Category selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-wider block">Category Area</label>
                <input
                  type="text"
                  list="category-options"
                  value={categoryVal}
                  onChange={(e) => setCategoryVal(e.target.value)}
                  required
                  placeholder="Type a category"
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-900 rounded-xl text-xs font-semibold focus:outline-none text-gray-900 placeholder:text-slate-400"
                />
                <datalist id="category-options">
                  {categories.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              {/* Market selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-wider block">Geographic Market</label>
                <input
                  type="text"
                  list="market-options"
                  value={marketVal}
                  onChange={(e) => setMarketVal(e.target.value)}
                  required
                  placeholder="Type a market"
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-900 rounded-xl text-xs font-semibold focus:outline-none text-gray-900 placeholder:text-slate-400"
                />
                <datalist id="market-options">
                  {markets.map(m => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>

              {/* KPI selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-wider block">Dependent Variable (KPI) (Optional)</label>
                <input
                  type="text"
                  list="kpi-options"
                  value={kpiVal}
                  onChange={(e) => setKpiVal(e.target.value)}
                  placeholder="Type a KPI (optional)"
                  className="w-full px-3 py-2 bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-900 rounded-xl text-xs font-semibold focus:outline-none text-gray-900 placeholder:text-slate-400"
                />
                <datalist id="kpi-options">
                  {kpis.map(k => (
                    <option key={k.id} value={k.name} />
                  ))}
                </datalist>
              </div>

              {/* Modal error info */}
              {modalError && (
                <p className="text-xs font-bold text-destructive bg-destructive/10 rounded-xl border border-destructive/20 p-2.5">{modalError}</p>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-3.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-gray-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
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
