import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Search,
  Award,
  LayoutDashboard,
  Grid3X3,
  FileText,
  Building,
  Layers,
  Globe,
  Activity,
  Tag,
  FolderOpen,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Plus,
  Mic,
  ChevronDown
} from 'lucide-react';
import api from '../../services/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    projects: 0,
    clients: 0,
    brands: 0,
    markets: 0,
    categories: 0,
    kpis: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  // Typewriter effect for search bar placeholder
  const placeholderTexts = [
    "Search credentials...",
    "Compare markets...",
    "Prepare pitches...",
    "Discover Kantar expertise..."
  ];
  const [placeholder, setPlaceholder] = useState("");
  const [currentTextIdx, setCurrentTextIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(80);

  useEffect(() => {
    let timer: any;
    const currentFullText = placeholderTexts[currentTextIdx];

    const handleType = () => {
      if (!isDeleting) {
        setPlaceholder(currentFullText.substring(0, placeholder.length + 1));
        setTypingSpeed(80);

        if (placeholder === currentFullText) {
          timer = setTimeout(() => setIsDeleting(true), 1600);
          return;
        }
      } else {
        setPlaceholder(currentFullText.substring(0, placeholder.length - 1));
        setTypingSpeed(45);

        if (placeholder === "") {
          setIsDeleting(false);
          setCurrentTextIdx((prev) => (prev + 1) % placeholderTexts.length);
          return;
        }
      }

      timer = setTimeout(handleType, typingSpeed);
    };

    timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [placeholder, isDeleting, currentTextIdx, typingSpeed]);

  const handleAISearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsNavigating(true);
    setTimeout(() => {
      navigate(`/copilot?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsNavigating(false);
    }, 600);
  };

  const handleChipClick = (prompt: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate(`/copilot?q=${encodeURIComponent(prompt)}`);
      setIsNavigating(false);
    }, 600);
  };

  useEffect(() => {
    api.get('/dashboard')
      .then(res => {
        setStats({
          projects: res.data.total_projects,
          clients: res.data.total_clients,
          brands: res.data.total_brands,
          markets: res.data.total_markets,
          categories: res.data.total_categories,
          kpis: res.data.total_kpis
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const navCards = [
    {
      title: "Capability Network",
      desc: "Explore how Kantar experience connects clients, brands, markets, categories, and KPI frameworks.",
      icon: Network,
      path: "/explorer",
      bgClass: "hover:bg-indigo-500/5",
      borderClass: "hover:border-indigo-500/20",
      textClass: "text-indigo-600 dark:text-indigo-400",
      iconBg: "group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-500/20"
    },
    {
      title: "Credential Repository",
      desc: "Browse historical analytical engagements and relevant experience footprints.",
      icon: Search,
      path: "/projects",
      bgClass: "hover:bg-blue-500/5",
      borderClass: "hover:border-blue-500/20",
      textClass: "text-blue-600 dark:text-blue-400",
      iconBg: "group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-500/20"
    },
    {
      title: "Expertise Coverage Matrix",
      desc: "Visualize Kantar's coverage across categories, markets, and KPI performance frameworks.",
      icon: Grid3X3,
      path: "/capability-matrix",
      bgClass: "hover:bg-teal-500/5",
      borderClass: "hover:border-teal-500/20",
      textClass: "text-teal-700 dark:text-teal-400",
      iconBg: "group-hover:bg-teal-500/10 group-hover:text-teal-700 dark:group-hover:text-teal-400 group-hover:border-teal-500/20"
    },
    {
      title: "Credential Finder",
      desc: "Identify specific engagement evidence matching combined category, market, and KPI requirements.",
      icon: Award,
      path: "/credentials",
      bgClass: "hover:bg-amber-500/5",
      borderClass: "hover:border-amber-500/20",
      textClass: "text-amber-700 dark:text-amber-500",
      iconBg: "group-hover:bg-amber-500/10 group-hover:text-amber-700 dark:group-hover:text-amber-500 group-hover:border-amber-500/20"
    },
    {
      title: "Kantar Capability Profile",
      desc: "Generate client-ready capability documents summarizing our analytical credentials.",
      icon: FileText,
      path: "/report",
      bgClass: "hover:bg-rose-500/5",
      borderClass: "hover:border-rose-500/20",
      textClass: "text-rose-700 dark:text-rose-400",
      iconBg: "group-hover:bg-rose-500/10 group-hover:text-rose-700 dark:group-hover:text-rose-400 group-hover:border-rose-500/20"
    },
    {
      title: "Executive Analytics",
      desc: "Review corporate performance distribution and modeling metrics across our credential coverage.",
      icon: LayoutDashboard,
      path: "/dashboard",
      bgClass: "hover:bg-slate-500/5",
      borderClass: "hover:border-slate-500/20",
      textClass: "text-slate-600 dark:text-slate-400",
      iconBg: "group-hover:bg-slate-500/10 group-hover:text-slate-600 dark:group-hover:text-slate-400 group-hover:border-slate-500/20"
    }
  ];

  const statItems = [
    { label: "Projects Delivered", val: stats.projects, icon: FolderOpen, color: "text-blue-600 dark:text-blue-400", border: "hover:border-blue-500/20", iconBg: "bg-blue-500/10" },
    { label: "Client Partnerships", val: stats.clients, icon: Building, color: "text-slate-600 dark:text-slate-400", border: "hover:border-slate-500/20", iconBg: "bg-slate-500/10" },
    { label: "Brands Modeled", val: stats.brands, icon: Tag, color: "text-indigo-600 dark:text-indigo-400", border: "hover:border-indigo-500/20", iconBg: "bg-indigo-500/10" },
    { label: "Markets Covered", val: stats.markets, icon: Globe, color: "text-teal-700 dark:text-teal-500", border: "hover:border-teal-500/20", iconBg: "bg-teal-500/10" },
    { label: "Categories Analyzed", val: stats.categories, icon: Layers, color: "text-amber-700 dark:text-amber-500", border: "hover:border-amber-500/20", iconBg: "bg-amber-500/10" },
    { label: "KPIs Tracked", val: stats.kpis, icon: Activity, color: "text-rose-700 dark:text-rose-400", border: "hover:border-rose-500/20", iconBg: "bg-rose-500/10" }
  ];

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-200">

        {/* Hero Section */}
        <div className="text-center space-y-3 pt-4 flex flex-col items-center">
          <div className="mb-2">
            <img
              src="/kantar_logo.png"
              alt="Kantar"
              className="h-8 md:h-12 w-auto object-contain dark:invert select-none pointer-events-none"
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Capability{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-indigo-600 dark:from-amber-400 dark:to-indigo-400">
              Intelligence Platform
            </span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Explore Kantar's analytical experience across clients, brands, categories, markets, and KPI frameworks to identify relevant expertise and credential strengths.
          </p>
        </div>

        {/* AI Search Bar Container */}
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <div className="relative group">
            {/* Ambient Background Glow Layer (Slow Pulse) */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#6366F1] via-[#EC4899] to-[#F59E0B] rounded-full blur-lg opacity-25 group-hover:opacity-40 group-focus-within:opacity-55 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

            {/* Main Glowing Border and Container */}
            <div className="relative p-[1.5px] rounded-full animate-glow-border shadow-[0_12px_40px_rgba(99,102,241,0.1)] transition-all duration-300 hover:scale-[1.01] group-focus-within:scale-[1.01] group-focus-within:shadow-[0_15px_50px_rgba(99,102,241,0.25)]">
              <div className="relative flex items-center bg-white rounded-full pl-5 pr-2 py-2 overflow-hidden">
                {/* Shimmer Sweep Reflex Effect */}
                <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-[#6366F1]/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>

                {/* Text Input Form */}
                <form onSubmit={handleAISearchSubmit} className="flex-1 flex items-center relative z-10">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none focus:outline-none placeholder:text-slate-400 text-xs font-semibold text-gray-900 pr-4"
                    autoFocus
                  />
                </form>

                {/* Submit button */}
                <button
                  onClick={handleAISearchSubmit}
                  type="button"
                  className="relative z-10 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all duration-150 shadow-sm flex items-center justify-center shrink-0 hover:scale-105 active:scale-95"
                  title="Ask AI"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Compact suggested chips */}
          <div className="flex flex-wrap gap-1.5 justify-center select-none">
            {[
              { label: 'Germany Credentials', prompt: 'Show all Germany credentials' },
              { label: 'Unilever Experience', prompt: 'Find similar clients to Unilever' },
              { label: 'Prepare Pitch', prompt: 'Prepare a pitch for P&G Germany' },
              { label: 'Compare Regions', prompt: 'Compare India vs USA expertise' },
              { label: 'Capability Gaps', prompt: 'What are our strongest categories?' },
              { label: 'Executive Summary', prompt: 'Provide executive overview of database metrics' }
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChipClick(chip.prompt)}
                className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-[#E2E8F0] bg-white hover:border-indigo-300 text-slate-500 hover:text-indigo-600 cursor-pointer transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transition State Loading Overlay */}
        {isNavigating && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-border shadow-xl flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 text-gray-900 animate-spin" />
              <p className="text-xs font-bold text-gray-900 tracking-wider animate-pulse uppercase">Opening Capability Copilot...</p>
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 select-none">
          {statItems.map((item, idx) => (
            <div
              key={idx}
              className={`glass-panel p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-xs transition-all duration-200 group border border-border/80 ${item.border}`}
            >
              <div className={`p-2 rounded-lg mb-2.5 ${item.iconBg} transition-all duration-200`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {loading ? (
                  <span className="inline-block w-8 h-5 bg-muted animate-pulse rounded" />
                ) : (
                  item.val
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-extrabold uppercase tracking-wider">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Why Kantar Experience Matters */}
        <div className="glass-panel p-8 rounded-2xl border border-border bg-card space-y-6">
          <div className="space-y-1">
            <h2 className="text-[13px] font-black tracking-widest text-primary uppercase">Why Kantar Experience Matters</h2>
            <p className="text-xs text-muted-foreground font-medium">Proven core capabilities backing our global client partnerships</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-left">
            <div className="space-y-2">
              <h3 className="text-xs font-black tracking-wider uppercase text-amber-600 dark:text-amber-400">Global Reach</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                Sovereign market modeling across global regions, providing local consumer insights with unified analytical excellence.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black tracking-wider uppercase text-indigo-600 dark:text-indigo-400">Cross-Category Expertise</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                Strategic analytics successfully adapted from high-velocity consumer goods to complex durables, services, and B2B verticals.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black tracking-wider uppercase text-teal-700 dark:text-teal-400">Advanced KPI Frameworks</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                Precise evaluation of brand equity, pricing elasticity, and marketing ROI through multi-dimensional modeling.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black tracking-wider uppercase text-rose-700 dark:text-rose-400">Brand Growth Experience</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                Decades of modeling brand equity growth paths to convert past historical evidence into forward-looking strategic directives.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black tracking-wider uppercase text-sky-700 dark:text-sky-400">Consumer Understanding</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                Deep synchronization of behavioral, motivational, and performance metrics to generate robust client proposals.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {navCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => navigate(card.path)}
              className={`group relative cursor-pointer glass-panel p-5 rounded-xl flex flex-col justify-between hover:shadow-md transition-all duration-200 border border-border/80 ${card.borderClass} ${card.bgClass}`}
            >
              <div className="space-y-3.5">
                <div className={`inline-flex p-2.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground ${card.iconBg} transition-all`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-bold ${card.textClass} mt-6 group-hover:translate-x-0.5 transition-transform`}>
                <span>Launch Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-muted-foreground/60 pt-6 border-t border-border/50">
          Kantar Capability Intelligence Platform • Connecting Kantar expertise across brands, categories, markets, and KPI frameworks • Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] font-bold">CMD+K</kbd> to search anywhere.
        </div>
      </div>
    </div>
  );
}
