import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  History,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Bot,
  Database,
  Search,
  Sun,
  Moon,
  Settings,
  User,
  Share2,
  Download,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  FileText,
  Activity,
  Compass,
  ArrowRight,
  BarChart2,
  Pencil
} from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useCopilotStore } from '../../store/copilotStore';

// Searchable entity grid component for long brand/client/kpi lists
function SearchableEntityGrid({ entities, title }: { entities: string[]; title?: string }) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const filtered = entities.filter(e => e.toLowerCase().includes(search.toLowerCase()));

  const handleCopy = () => {
    navigator.clipboard.writeText(entities.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name\n" + entities.map(e => `"${e.replace(/"/g, '""')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title ? title.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'list'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="my-4 border border-[#E2E8F0] rounded-2xl bg-white p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] space-y-4 max-w-[750px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div>
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">{title || 'Items List'}</h4>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{entities.length} items found</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-slate-600 hover:text-gray-950 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
          >
            {copied ? 'Copied!' : 'Copy List'}
          </button>
          <button 
            type="button"
            onClick={handleDownloadCSV}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-slate-600 hover:text-gray-950 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="relative flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs">
        <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
        <input 
          type="text" 
          placeholder="Search items..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none focus:outline-none w-full text-xs font-semibold text-gray-900 placeholder:text-slate-400"
        />
      </div>

      <div className="max-h-60 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1.5 py-1 select-text scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-semibold italic col-span-full py-6 text-center">No matching items</p>
        ) : (
          filtered.map(entity => (
            <div 
              key={entity} 
              className="px-3 py-2 bg-[#FAFAFA] border border-transparent hover:border-[#E2E8F0] hover:bg-white text-[11px] font-bold text-gray-800 rounded-xl transition-all truncate" 
              title={entity}
            >
              {entity}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Deep-parse assistant message blocks to render structured consulting widgets (tables, metric grids, cards)
function renderAssistantContent(text: string, onToggleEvidence?: () => void) {
  if (!text) return null;

  const blocks = text.split('\n\n');
  const renderedBlocks: React.ReactNode[] = [];

  const renderInline = (lineText: string) => {
    const parts = lineText.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold text-gray-900">{part}</strong>;
      }
      return part;
    });
  };

  blocks.forEach((block, blockIdx) => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;

    // 1. Check if block is a Table
    if (trimmedBlock.includes('|') && trimmedBlock.split('\n').length > 1) {
      const rows = trimmedBlock.split('\n').map(r => r.trim()).filter(Boolean);
      const headers = rows[0]
        .split('|')
        .map(h => h.trim())
        .filter(h => h !== '');

      const bodyRows = rows.slice(2).map(row =>
        row.split('|').map(c => c.trim()).filter(c => c !== '')
      );

      if (headers.length > 0 && bodyRows.length > 0) {
        renderedBlocks.push(
          <div key={`table-${blockIdx}`} className="overflow-x-auto my-3 border border-[#E2E8F0] rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-xs text-left">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-transparent">
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2 text-gray-900 font-medium">{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return;
      }
    }

    // 2. Check if block is a list of credentials (e.g. multiple key-value pairs like Client:, Category:, KPI:)
    const lines = trimmedBlock.split('\n');
    const isCredentialCard = lines.every(line => {
      const trimmedLine = line.trim();
      return trimmedLine === '' || trimmedLine.includes(':') || trimmedLine.match(/^[-*•]\s+/);
    }) && lines.some(line => line.includes('Client:') || line.includes('Category:') || line.includes('KPI:'));

    if (isCredentialCard) {
      const cards: { [key: string]: string }[] = [];
      let currentCard: { [key: string]: string } = {};

      lines.forEach(line => {
        const cleaned = line.trim().replace(/^[-*•]\s+/, '');
        if (cleaned.includes(':')) {
          const colonIdx = cleaned.indexOf(':');
          const key = cleaned.substring(0, colonIdx).trim();
          const val = cleaned.substring(colonIdx + 1).trim();

          // If we already have this key, start a new card
          if (currentCard[key]) {
            cards.push(currentCard);
            currentCard = {};
          }
          currentCard[key] = val;
        }
      });
      if (Object.keys(currentCard).length > 0) {
        cards.push(currentCard);
      }

      if (cards.length > 0) {
        renderedBlocks.push(
          <div key={`grid-${blockIdx}`} className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
            {cards.map((card, cIdx) => (
              <div
                key={cIdx}
                className="border border-[#E2E8F0] bg-white hover:border-gray-300 p-3.5 rounded-[16px] transition-all duration-200 hover:-translate-y-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] space-y-1.5"
              >
                <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-1.5 mb-1.5">
                  <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Credential Spec</span>
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                </div>
                {Object.entries(card).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">{k}</span>
                    <span className="font-semibold text-gray-900 text-right">{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
        return;
      }
    }

    // 2.5 Check if block is a long list of items (e.g. unique brands, categories, etc.)
    const itemsLines = trimmedBlock.split('\n').map(l => l.trim()).filter(Boolean);
    if (itemsLines.length > 8) {
      const wordCounts = itemsLines.map(line => line.replace(/^[-*•]\s+/, '').trim().split(/\s+/).filter(Boolean).length);
      const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / itemsLines.length;
      
      if (avgWordCount <= 4) {
        let startIndex = 0;
        let title = 'Items List';
        
        // If the first line acts as a title, use it
        if (itemsLines[0].startsWith('#') || (itemsLines[0].toLowerCase().includes('brand') || itemsLines[0].toLowerCase().includes('client') || itemsLines[0].toLowerCase().includes('category') || itemsLines[0].toLowerCase().includes('market') || itemsLines[0].toLowerCase().includes('kpi') || itemsLines[0].toLowerCase().includes('list') || itemsLines[0].toLowerCase().includes('overview') || itemsLines[0].toLowerCase().includes('report'))) {
          title = itemsLines[0].replace(/^(#{1,6})\s+/, '').trim();
          startIndex = 1;
        }
        
        const entities = itemsLines.slice(startIndex)
          .map(line => line.trim().replace(/^[-*•]\s+/, '').replace(/\*\*([^*]+)\*\*/g, '$1'))
          .filter(Boolean);
          
        if (entities.length > 6) {
          renderedBlocks.push(
            <SearchableEntityGrid 
              key={`searchable-grid-${blockIdx}`} 
              entities={entities} 
              title={title} 
            />
          );
          return;
        }
      }
    }

    // 3. Render generic headings or lists
    let listItems: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Headers
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        // Flush active list first
        if (listItems.length > 0) {
          renderedBlocks.push(
            <ul key={`ul-${blockIdx}-${lineIdx}`} className="list-disc pl-5 my-2 space-y-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              {listItems}
            </ul>
          );
          listItems = [];
        }
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        const inlineParsed = renderInline(headerText);

        if (level === 1) {
          renderedBlocks.push(<h3 key={`h1-${blockIdx}-${lineIdx}`} className="text-md font-bold text-gray-900 mt-4 mb-2 border-b border-[#E2E8F0] pb-1">{inlineParsed}</h3>);
        } else if (level === 2) {
          renderedBlocks.push(<h4 key={`h2-${blockIdx}-${lineIdx}`} className="text-sm font-bold text-gray-900 mt-3 mb-1.5">{inlineParsed}</h4>);
        } else {
          renderedBlocks.push(<h5 key={`h3-${blockIdx}-${lineIdx}`} className="text-xs font-semibold text-slate-500 mt-2.5 mb-1">{inlineParsed}</h5>);
        }
        return;
      }

      // Bullets
      const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
      if (bulletMatch) {
        listItems.push(
          <li key={`li-${blockIdx}-${lineIdx}`} className="pl-0.5 marker:text-gray-500">
            {renderInline(bulletMatch[1])}
          </li>
        );
        return;
      }

      // Normal line
      if (listItems.length > 0) {
        renderedBlocks.push(
          <ul key={`ul-${blockIdx}-${lineIdx}`} className="list-disc pl-5 my-2 space-y-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
            {listItems}
          </ul>
        );
        listItems = [];
      }

      renderedBlocks.push(
        <p key={`p-${blockIdx}-${lineIdx}`} className="my-1.5 text-xs sm:text-sm text-gray-900 leading-relaxed font-medium">
          {renderInline(line)}
        </p>
      );
    });

    if (listItems.length > 0) {
      renderedBlocks.push(
        <ul key={`ul-${blockIdx}-final`} className="list-disc pl-5 my-2 space-y-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
          {listItems}
        </ul>
      );
    }
  });

  return renderedBlocks;
}

// Group threads by modern categories
const groupThreads = (threadsList: any[]) => {
  const groups: { [key: string]: any[] } = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Last 30 Days': [],
    'Saved Pitches': [],
    'Saved Reports': []
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  threadsList.forEach(t => {
    const created = t.createdAt || Date.now();
    if (t.title.toLowerCase().includes('pitch') || t.title.toLowerCase().includes('proposal')) {
      groups['Saved Pitches'].push(t);
    } else if (t.title.toLowerCase().includes('report') || t.title.toLowerCase().includes('summary')) {
      groups['Saved Reports'].push(t);
    } else if (created >= todayStart) {
      groups['Today'].push(t);
    } else if (created >= yesterdayStart) {
      groups['Yesterday'].push(t);
    } else if (created >= sevenDaysAgoStart) {
      groups['Last 7 Days'].push(t);
    } else {
      groups['Last 30 Days'].push(t);
    }
  });

  return Object.entries(groups)
    .map(([title, list]) => ({ title, threads: list }))
    .filter(g => g.threads.length > 0);
};

export default function CopilotDrawer() {
  const {
    isCopilotOpen,
    threads,
    activeThreadId,
    isLoading,
    responseMode,
    isSidebarCollapsed,
    isEvidenceDrawerOpen,
    evidenceData,
    setCopilotOpen,
    setActiveThreadId,
    setResponseMode,
    setSidebarCollapsed,
    setEvidenceDrawerOpen,
    createThread,
    deleteThread,
    sendMessage,
    clearCurrentThread,
    renameThread
  } = useCopilotStore();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeThread = threads.find(t => t.id === activeThreadId);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Watch for incoming query from URL
  useEffect(() => {
    // Only intercept query parameters 'q' if we are on the landing/overview or copilot page,
    // to avoid query parameter collisions with other search bars (e.g. `/projects`).
    if (location.pathname !== '/' && location.pathname !== '/copilot') {
      return;
    }
    const q = searchParams.get('q');
    if (q && q.trim()) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('q');
      setSearchParams(newParams, { replace: true });

      setCopilotOpen(true);
      sendMessage(q.trim());
    }
  }, [searchParams, setSearchParams, setCopilotOpen, sendMessage, location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-scroll on messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages, isLoading]);

  // Height adjust for auto-growing prompt input
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [input]);



  const startEditing = (id: string, currentTitle: string) => {
    setEditingThreadId(id);
    setEditTitle(currentTitle);
  };

  const saveEditing = async (id: string) => {
    if (editTitle.trim()) {
      await renameThread(id, editTitle.trim());
    }
    setEditingThreadId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleActionClick = async (actionName: string) => {
    let prompt = '';
    switch (actionName) {
      case 'Find Credentials': prompt = "Find all project credentials in database"; break;
      case 'Prepare Pitch': prompt = "Write pitch narrative for Category KPI context"; break;
      case 'Client Intelligence': prompt = "Summarize client relationships in Germany"; break;
      case 'Market Expertise': prompt = "Analyze market expertise for Europe regions"; break;
      case 'Capability Gaps': prompt = "Highlight missing categories and KPI gaps in database"; break;
      case 'Executive Summary': prompt = "Provide executive overview of database metrics"; break;
      case 'Compare Regions': prompt = "Compare projects between UK and Germany"; break;
      case 'Find Similar Clients': prompt = "Find similar client brands in automotive category"; break;
    }
    if (prompt) {
      setInput('');
      await sendMessage(prompt);
    }
  };

  const handleFollowUpClick = async (chip: string) => {
    setInput('');
    await sendMessage(chip);
  };

  const threadGroups = groupThreads(threads.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  const quickActions = [
    { name: 'Find Credentials', icon: <Database className="w-4 h-4" /> },
    { name: 'Prepare Pitch', icon: <FileText className="w-4 h-4" /> },
    { name: 'Client Intelligence', icon: <User className="w-4 h-4" /> },
    { name: 'Market Expertise', icon: <Compass className="w-4 h-4" /> },
    { name: 'Capability Gaps', icon: <Activity className="w-4 h-4" /> },
    { name: 'Executive Summary', icon: <BarChart2 className="w-4 h-4" /> },
    { name: 'Compare Regions', icon: <LayoutGrid className="w-4 h-4" /> },
    { name: 'Find Similar Clients', icon: <Sparkles className="w-4 h-4" /> }
  ];

  return (
    <div className={`fixed inset-0 z-50 flex select-none bg-[#FAFAFA] text-gray-900 font-sans overflow-hidden transition-all duration-300 ease-out ${isCopilotOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
      }`}>

      {/* 1. LEFT SIDEBAR (zinc-50 darker background surface than content) */}
      <div
        className={`bg-[#FCFCFD] border-r border-[#E5E7EB] h-full flex flex-col shrink-0 transition-all duration-200 ${isSidebarCollapsed ? 'w-14' : 'w-[280px]'
          }`}
      >
        {/* Sticky Top Header Area */}
        <div className="p-3 border-b border-[#E5E7EB] space-y-3 shrink-0 bg-[#FCFCFD]">
          {/* Brand header with collapse button */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              <div 
                className="w-[20px] overflow-hidden flex justify-start cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setCopilotOpen(false);
                  navigate('/');
                }}
                title="Go to Homepage"
              >
                <img 
                  src="/kantar_logo.png" 
                  alt="Kantar" 
                  className="h-6 max-w-none w-auto object-contain dark:invert select-none pointer-events-none" 
                  style={{ objectPosition: 'left' }}
                />
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F3F4F6] text-slate-400 hover:text-gray-900 transition-all duration-180 cursor-pointer"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div 
                className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setCopilotOpen(false);
                  navigate('/');
                }}
                title="Go to Homepage"
              >
                <div className="flex items-center gap-2">
                  <img 
                    src="/kantar_logo.png" 
                    alt="Kantar" 
                    className="h-3 w-auto object-contain dark:invert select-none pointer-events-none" 
                  />
                  <span className="font-bold text-[11px] text-gray-900 tracking-wide">Capability Copilot</span>
                </div>
                <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Business Strategy & Analytics</span>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F3F4F6] text-slate-400 hover:text-gray-900 transition-all duration-180 cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* New Chat Button */}
          {isSidebarCollapsed ? (
            <button
              onClick={createThread}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111827] hover:bg-[#1F2937] active:bg-[#374151] text-white cursor-pointer transition-all duration-180 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 mx-auto"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={createThread}
              className="flex items-center justify-center gap-2 w-full h-11 text-xs font-semibold rounded-xl bg-[#111827] hover:bg-[#1F2937] active:bg-[#374151] text-white cursor-pointer transition-all duration-180 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          )}

          {/* Search Bar */}
          {!isSidebarCollapsed && (
            <div className="relative flex items-center bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-2 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none w-full text-gray-900 font-medium"
              />
            </div>
          )}
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
          {threadGroups.map(group => (
            <div key={group.title} className="space-y-1">
              {!isSidebarCollapsed && (
                <span className="px-2.5 text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">
                  {group.title}
                </span>
              )}
              <div className="space-y-0.5">
                {group.threads.map(t => {
                  const isActive = t.id === activeThreadId;
                  const isEditing = t.id === editingThreadId;

                  return isSidebarCollapsed ? (
                    <div
                      key={t.id}
                      className={`flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-180 hover:-translate-y-0.5 relative mx-auto my-1 ${isActive
                        ? 'bg-gray-100 border border-gray-200/80 text-gray-900'
                        : 'hover:bg-[#F3F4F6] text-gray-900 border border-transparent'
                        }`}
                      onClick={() => setActiveThreadId(t.id)}
                      title={t.title === 'New Conversation' ? 'New Chat' : t.title}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-gray-900 rounded-r" />
                      )}
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-gray-950' : 'text-slate-400'}`} />
                    </div>
                  ) : (
                    <div
                      key={t.id}
                      className={`group flex items-center justify-between px-2.5 py-2 h-10 rounded-lg cursor-pointer transition-all duration-180 hover:-translate-y-0.5 relative ${isActive
                        ? 'bg-gray-100 border border-gray-200/80 text-gray-900 font-semibold'
                        : 'hover:bg-[#F3F4F6] text-gray-900 border border-transparent'
                        }`}
                      onClick={() => !isEditing && setActiveThreadId(t.id)}
                    >
                      {/* Active Left Indicator Bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-gray-900 rounded-r" />
                      )}

                      <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-gray-950' : 'text-slate-400'}`} />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => saveEditing(t.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditing(t.id)}
                            className="bg-white text-gray-900 text-xs px-1 py-0.5 rounded border border-[#E2E8F0] w-full focus:outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className="text-[13px] truncate flex-1 font-medium leading-none"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startEditing(t.id, t.title === 'New Conversation' ? 'New Chat' : t.title);
                            }}
                            title="Double click to rename"
                          >
                            {t.title === 'New Conversation' ? 'New Chat' : t.title}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(t.id, t.title);
                            }}
                             className="p-0.5 hover:text-gray-900 text-[#94A3B8] rounded cursor-pointer"
                            title="Rename Session"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteThread(t.id);
                            }}
                            className="p-0.5 hover:text-rose-600 text-[#94A3B8] rounded cursor-pointer"
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Bottom User Profile Section */}
        {isSidebarCollapsed ? (
          <div className="p-3 border-t border-[#E5E7EB] bg-[#FCFCFD] shrink-0 flex justify-center">
            <div 
              className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              title="Chethan (Strategy Workspace)"
            >
              C
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-[#E5E7EB] bg-[#FCFCFD] shrink-0">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F3F4F6] cursor-pointer transition-all duration-180 select-none group/profile">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                C
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Chethan</p>
                <p className="text-[10px] text-slate-500 truncate">Strategy Workspace</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover/profile:text-gray-900 transition-colors" />
            </div>
          </div>
        )}
      </div>

      {/* 2. CENTER WORKSPACE */}
      <div className="flex-1 flex flex-col h-full bg-[#FAFAFA] relative overflow-hidden">

        {/* EXECUTIVE HEADER */}
        <div className="h-14 border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 bg-white/70 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-bold text-[13px] text-gray-900 tracking-wide leading-none">
                {activeThread && activeThread.messages.length > 0 ? ((activeThread.title === 'New Conversation' || activeThread.title === 'New Chat') ? 'New Chat' : (activeThread.title || 'Chat')) : 'New Chat'}
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-none">
                {activeThread && activeThread.messages.length > 0 ? 'Chat Strategic Context' : 'AI-Powered Capability Discovery & Strategic Intelligence'}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCopilotOpen(false)}
              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-rose-50 hover:text-rose-600 text-slate-400 cursor-pointer transition-colors duration-150"
              title="Exit Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto select-text scrollbar-thin py-4 bg-[#FAFAFA]">
          <div className="max-w-[1000px] mx-auto w-full px-6 flex flex-col min-h-full justify-between">

            {(!activeThread || activeThread.messages.length === 0) ? (
              // Executive Landing Experience
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-10">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200 mb-4 shadow-sm animate-pulse">
                  <Bot className="w-6 h-6 text-gray-700" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  What would you like to explore?
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed max-w-lg mb-8 font-medium mt-2">
                  Search credentials, discover expertise, prepare proposals, analyze markets, and uncover capability intelligence.
                </p>

                {/* 8 Compact Quick Actions Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                  {quickActions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleActionClick(s.name)}
                      className="flex flex-col items-center justify-center gap-2 text-center p-4 bg-white border border-[#E2E8F0] hover:border-gray-400 rounded-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="p-1.5 rounded-lg bg-gray-50 text-gray-700 shrink-0">
                        {s.icon}
                      </div>
                      <span className="text-[10px] font-bold text-gray-900 leading-tight block">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Active Conversation Flow
              <div className="space-y-4 flex-1">
                {activeThread.messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {isUser ? (
                        // User message: Small floating bubble on the right, max-width 700px
                        <div className="max-w-[700px] bg-white border border-[#E2E8F0] shadow-[0_1px_2px_rgba(0,0,0,0.02)] px-4 py-2.5 rounded-2xl rounded-tr-sm text-xs font-semibold leading-relaxed text-gray-900">
                          {msg.content}
                        </div>
                      ) : (
                        // Assistant message: Left-aligned, ChatGPT-style, max-width 850px, hover actions
                        <div className="group/msg flex gap-3.5 max-w-[850px] w-full bg-transparent p-1 rounded-xl transition-all duration-150">
                          {/* Assistant Icon */}
                          <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 shadow-xs">
                            <Bot className="w-3.5 h-3.5 text-gray-700" />
                          </div>

                          {/* Content & Actions wrapper */}
                          <div className="flex-1 min-w-0 space-y-1.5 relative">
                            {/* Hover Actions Bar (Copy, Export, Evidence, Share) */}
                            <div className="absolute right-0 top-[-10px] opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-lg p-0.5 shadow-md z-10 transition-all duration-150">
                              <button
                                onClick={() => copyToClipboard(msg.content, index)}
                                className="p-1 text-slate-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors cursor-pointer"
                                title="Copy Response"
                              >
                                {copiedId === index ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                className="p-1 text-slate-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors cursor-pointer"
                                title="Export Report"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEvidenceDrawerOpen(true)}
                                className="p-1 text-slate-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors cursor-pointer"
                                title="View Evidence Panel"
                              >
                                <Database className="w-3 h-3" />
                              </button>
                              <button
                                className="p-1 text-slate-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors cursor-pointer"
                                title="Share Chat"
                              >
                                <Share2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Render Custom Structured Blocks */}
                            <div className="select-text pr-2">
                              {renderAssistantContent(msg.content, () => setEvidenceDrawerOpen(true))}
                            </div>

                            {/* Follow-up Suggestion Chips under Response */}
                            {index === activeThread.messages.length - 1 && (
                              <div className="flex flex-wrap gap-1.5 pt-3 select-none">
                                {[
                                  'Compare Similar Markets',
                                  'Find Related Credentials',
                                  'Prepare Pitch',
                                  'Export Summary',
                                  'View Entity Profile'
                                ].map((chip) => (
                                  <button
                                    key={chip}
                                    onClick={() => handleFollowUpClick(chip)}
                                    className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-[#E2E8F0] bg-white hover:border-gray-400 text-slate-500 hover:text-gray-900 cursor-pointer transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                  >
                                    {chip}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-3.5 max-w-[850px] w-full bg-transparent p-1.5 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-gray-500 animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-gray-500 animate-spin" />
                        <span className="text-xs font-semibold text-slate-500 animate-pulse">Consulting capability insights...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

          </div>
        </div>

        {/* Premium Input Area */}
        <div className="p-4 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent border-t border-[#E2E8F0] shrink-0 z-10">
          <div className="max-w-[800px] mx-auto w-full space-y-3">

            {/* Input area */}
            <div className="relative border border-[#E2E8F0] rounded-[16px] bg-white transition-all duration-200 focus-within:border-gray-500 focus-within:ring-4 focus-within:ring-gray-500/10 flex flex-col p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">

              {/* Dropdown Select Mode Button */}
              <div className="relative mb-2 self-start" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer transition-all duration-150"
                >
                  {responseMode === 'quick' && '⚡ Instant Answer'}
                  {responseMode === 'analysis' && '📊 Strategic Analysis'}
                  {responseMode === 'report' && '📄 Executive Report'}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isModeDropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-72 bg-white border border-[#E2E8F0] rounded-[16px] shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-30 py-2.5 animate-fade-in">
                    {(['quick', 'analysis', 'report'] as const).map((mode) => {
                      const isActive = responseMode === mode;
                      const details = {
                        quick: { title: '⚡ Instant Answer', desc: 'Fast factual responses.' },
                        analysis: { title: '📊 Strategic Analysis', desc: 'Deep business insights and recommendations.' },
                        report: { title: '📄 Executive Report', desc: 'Board-ready narratives and executive summaries.' }
                      };
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setResponseMode(mode);
                            setIsModeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 transition-all duration-150 flex flex-col gap-0.5 cursor-pointer ${isActive
                            ? 'bg-gray-100 border-l-2 border-gray-900 text-gray-900'
                            : 'hover:bg-gray-50'
                            }`}
                        >
                          <span className="text-xs font-bold text-gray-900">{details[mode].title}</span>
                          <span className="text-[10px] text-slate-500 leading-normal">{details[mode].desc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Text Input Row */}
              <div className="flex items-end w-full pr-10 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  rows={1}
                  placeholder="Ask about credentials, markets, clients, KPI expertise, or pitch preparation..."
                  className="w-full pl-1.5 pr-2 py-1 text-xs font-semibold bg-transparent border-none focus:outline-none placeholder:text-slate-400 disabled:opacity-50 resize-none min-h-[30px] max-h-[160px] text-gray-900"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-0 bottom-1 p-2 rounded-lg bg-gray-950 hover:bg-gray-800 text-white disabled:bg-gray-100 disabled:text-slate-400 cursor-pointer transition-all duration-150 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            <div className="text-[8px] text-slate-400 text-center font-bold tracking-widest uppercase mt-1">
              Capability Copilot is AI and can make mistakes.
            </div>


          </div>
        </div>

      </div>

      {/* 3. SLIDE-OUT RIGHT EVIDENCE DRAWER */}
      <EvidencePanel
        content={evidenceData}
        isOpen={isEvidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
      />

    </div>
  );
}

// Compact Sub-component for Evidence drawer rendering
function EvidencePanel({ content, isOpen, onClose }: { content: string; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="w-[340px] shrink-0 border-l border-[#E2E8F0] h-full bg-zinc-50 flex flex-col shadow-xl animate-slide-in-right z-20">
      <div className="h-14 px-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-700" />
          <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-900">Retrieved Context Records</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 border border-[#E2E8F0] text-slate-400 hover:text-gray-900 cursor-pointer transition-colors duration-150"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text scrollbar-thin bg-zinc-50">
        {content ? (
          <div className="space-y-3">
            {content.split('\n\n').map((section, idx) => {
              if (section.trim().startsWith('Global Database Overview') || section.trim().startsWith('Project Distribution')) {
                const lines = section.split('\n');
                const title = lines[0];
                const listItems = lines.slice(1);
                return (
                  <div key={idx} className="bg-white p-3.5 rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <span className="text-[10px] font-bold text-gray-900 block mb-2">{title}</span>
                    <ul className="space-y-1.5">
                      {listItems.map((item, itemIdx) => {
                        const cleanItem = item.replace(/^[-*•]\s+/, '');
                        if (cleanItem.includes(':')) {
                          const [label, val] = cleanItem.split(':');
                          return (
                            <li key={itemIdx} className="text-[10px] flex justify-between gap-2">
                              <span className="text-slate-500 font-semibold">{label.trim()}</span>
                               <span className="font-mono font-bold text-gray-900 shrink-0">{val.trim()}</span>
                            </li>
                          );
                        }
                        return (
                          <li key={itemIdx} className="text-[10px] text-slate-500 list-disc ml-3 font-semibold">
                            {cleanItem}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              }
              return (
                <div key={idx} className="text-[11px] whitespace-pre-wrap font-sans text-slate-500 border-l-2 border-gray-400 pl-2.5 py-0.5 leading-relaxed font-semibold">
                  {section}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Info className="w-7 h-7 text-slate-400/70 mb-2" />
            <p className="text-xs text-slate-500 font-bold">No evidence context loaded.</p>
            <p className="text-[9px] text-slate-400 mt-1">Submit targeting queries to review database source records used in assistant answers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
