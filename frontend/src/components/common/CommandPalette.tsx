import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building, Tag, Globe, Layers, Activity, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import api from '../../services/api';

interface SearchItem {
  id: string;
  name: string;
  type: 'CLIENT' | 'BRAND' | 'CATEGORY' | 'MARKET' | 'KPI';
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [filtered, setFiltered] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preload dimensions once when opened or on mount
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Fetch dimensions to cache for search
      Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/brands').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/markets').catch(() => ({ data: [] })),
        api.get('/kpis').catch(() => ({ data: [] }))
      ]).then(([c, b, cat, m, k]) => {
        const merged: SearchItem[] = [
          ...c.data.map((x: any) => ({ id: x.id, name: x.name, type: 'CLIENT' as const })),
          ...b.data.map((x: any) => ({ id: x.id, name: x.name, type: 'BRAND' as const })),
          ...cat.data.map((x: any) => ({ id: x.id, name: x.name, type: 'CATEGORY' as const })),
          ...m.data.map((x: any) => ({ id: x.id, name: x.name, type: 'MARKET' as const })),
          ...k.data.map((x: any) => ({ id: x.id, name: x.name, type: 'KPI' as const }))
        ];
        setItems(merged);
        setFiltered(merged.slice(0, 10)); // Initial top results
      });
    }
  }, [commandPaletteOpen]);

  // Keyboard shortcut listener for CMD+K / CTRL+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  // Filter items based on query
  useEffect(() => {
    if (!query.trim()) {
      // If empty, show top 10 items
      setFiltered(items.slice(0, 10));
      setSelectedIndex(0);
      return;
    }
    const cleanQuery = query.toLowerCase().trim();
    const matches = items.filter(
      item => item.name.toLowerCase().includes(cleanQuery)
    );
    setFiltered(matches.slice(0, 10)); // Limit to top 10 matches
    setSelectedIndex(0);
  }, [query, items]);

  // Handle arrow key and enter operations
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        selectItem(filtered[selectedIndex]);
      }
    }
  };

  const selectItem = (item: SearchItem) => {
    setCommandPaletteOpen(false);
    navigate(`/entity/${item.type.toLowerCase()}/${item.id}`);
  };

  if (!commandPaletteOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLIENT': return <Building className="w-4 h-4 text-indigo-400" />;
      case 'BRAND': return <Tag className="w-4 h-4 text-purple-400" />;
      case 'CATEGORY': return <Layers className="w-4 h-4 text-amber-400" />;
      case 'MARKET': return <Globe className="w-4 h-4 text-emerald-400" />;
      case 'KPI': return <Activity className="w-4 h-4 text-rose-400" />;
      default: return <Search className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[15vh] px-4 z-50 select-none animate-in fade-in duration-200">
      
      {/* Click outside to close overlay */}
      <div className="absolute inset-0" onClick={() => setCommandPaletteOpen(false)} />
      
      <div 
        ref={containerRef}
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden relative z-10 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border h-12">
          <Search className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search clients, brands, markets, categories, KPIs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-0 outline-hidden ring-0 text-sm placeholder-muted-foreground"
          />
          <button 
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No entities found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  idx === selectedIndex 
                    ? 'bg-secondary text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getTypeIcon(item.type)}
                  <span>{item.name}</span>
                </div>
                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-border bg-card uppercase opacity-85">
                  {item.type}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Command Footer */}
        <div className="px-4 py-2 border-t border-border bg-secondary/25 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <span>Navigate:</span>
            <kbd className="px-1.5 py-0.5 rounded border bg-card">↑↓</kbd>
            <span>Select:</span>
            <kbd className="px-1.5 py-0.5 rounded border bg-card">Enter</kbd>
          </div>
          <div>
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
