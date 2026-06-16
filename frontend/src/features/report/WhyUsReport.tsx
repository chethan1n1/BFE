import React, { useEffect, useState } from 'react';
import { 
  Printer, 
  Presentation, 
  Sparkles, 
  CheckCircle, 
  BookOpen, 
  ChevronRight,
  Globe,
  Building,
  Award,
  Layers,
  Tag,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import pptxgen from 'pptxgenjs';
import api from '../../services/api';
import type { DashboardStats } from '../../types';

export default function WhyUsReport() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load metrics for the capability report.');
        setLoading(false);
      });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPPTX = () => {
    if (!stats) return;

    // Create PPTX instance
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9'; // Note: In pptxgenjs, 16x9 layout is 10 x 5.625 inches

    // Theme colors
    const COLOR_PRIMARY = 'f59e0b'; // Kantar Amber/Gold
    const COLOR_DARK = '111111'; // Slate Black
    const COLOR_LIGHT_BG = 'f8fafc'; // Off-white/slate-50
    const COLOR_TEXT_MUTED = '6b7280'; // Slate-500
    const COLOR_TEXT_DARK = '1e293b'; // Slate-800

    // Slide 1: Cover slide (Premium light theme)
    const slide1 = pptx.addSlide();
    slide1.background = { fill: COLOR_LIGHT_BG };

    // Brand gold accent bar at top
    slide1.addShape('rect', {
      x: 0, y: 0, w: 10.0, h: 0.15,
      fill: { color: COLOR_PRIMARY }
    });

    // Kantar Logo (fully visible on light background)
    slide1.addImage({
      path: '/kantar_logo.png',
      x: 1.0, y: 1.2, w: 1.8, h: 0.4
    });

    slide1.addText('Kantar Capability Intelligence Platform', {
      x: 1.0, y: 2.2, w: 8.0, h: 0.9,
      fontSize: 28, color: COLOR_DARK, bold: true, fontFace: 'Helvetica'
    });
    slide1.addText('Business Strategy & Analytics — Strategic Capability Profile', {
      x: 1.0, y: 3.1, w: 8.0, h: 0.4,
      fontSize: 13, color: 'd97706', bold: true, fontFace: 'Helvetica'
    });
    
    // Decorative subtle line divider
    slide1.addShape('rect', {
      x: 1.0, y: 3.7, w: 3.0, h: 0.02,
      fill: { color: 'cbd5e1' }
    });

    slide1.addText('Explore Kantar\'s depth & breadth of analytical experience across global markets.', {
      x: 1.0, y: 4.0, w: 8.0, h: 0.6,
      fontSize: 11, color: '475569', italic: true, fontFace: 'Helvetica'
    });

    // Slide 2: Capability summary (Light theme)
    const slide2 = pptx.addSlide();
    slide2.background = { fill: COLOR_LIGHT_BG };

    // Accent bar
    slide2.addShape('rect', {
      x: 0, y: 0, w: 10.0, h: 0.1,
      fill: { color: COLOR_PRIMARY }
    });

    // Header Kantar logo
    slide2.addImage({
      path: '/kantar_logo.png',
      x: 8.0, y: 0.35, w: 1.2, h: 0.27
    });

    slide2.addText('OUR INSTITUTIONAL STRATEGY EXPERIENCE', {
      x: 0.8, y: 0.45, w: 7.0, h: 0.3,
      fontSize: 13, color: COLOR_DARK, bold: true, fontFace: 'Helvetica'
    });
    slide2.addText('Verified execution footprint compiled from master credential database.', {
      x: 0.8, y: 0.75, w: 7.0, h: 0.25,
      fontSize: 9, color: COLOR_TEXT_MUTED, fontFace: 'Helvetica'
    });
    
    // Add 4 stat blocks (aligned to 10-inch width)
    const blocks = [
      { num: stats.total_projects.toString(), label: 'Analytical Credentials', color: '4f46e5' }, // Indigo
      { num: stats.total_clients.toString(), label: 'Client Partners', color: '059669' }, // Emerald
      { num: stats.total_brands.toString(), label: 'Brands Modeled', color: 'd97706' }, // Amber
      { num: stats.total_markets.toString(), label: 'Sovereign Markets', color: '7c3aed' } // Purple
    ];

    blocks.forEach((b, idx) => {
      // Usable width: 0.8 to 9.2 (total 8.4 inches)
      // 4 blocks of width 1.95 = 7.8 inches. Remainder 0.6 / 3 gaps = 0.2 gap.
      const xOffset = 0.8 + idx * 2.15;
      
      // Card background shape
      slide2.addShape('rect', {
        x: xOffset, y: 1.5, w: 1.95, h: 2.5,
        fill: { color: 'ffffff' }, line: { color: 'e2e8f0', width: 1 }
      });

      // Decorative top border on each card
      slide2.addShape('rect', {
        x: xOffset, y: 1.5, w: 1.95, h: 0.08,
        fill: { color: b.color }
      });

      // Large number metric
      slide2.addText(b.num, {
        x: xOffset + 0.05, y: 2.1, w: 1.85, h: 0.6,
        fontSize: 34, color: COLOR_DARK, bold: true, align: 'center', fontFace: 'Helvetica'
      });

      // Label description
      slide2.addText(b.label, {
        x: xOffset + 0.05, y: 2.9, w: 1.85, h: 0.5,
        fontSize: 10, color: COLOR_TEXT_MUTED, bold: true, align: 'center', fontFace: 'Helvetica'
      });
    });

    // Slide 3: Strength metrics lists (Geographic & Category portfolio)
    const slide3 = pptx.addSlide();
    slide3.background = { fill: COLOR_LIGHT_BG };

    // Accent bar
    slide3.addShape('rect', {
      x: 0, y: 0, w: 10.0, h: 0.1,
      fill: { color: COLOR_PRIMARY }
    });

    // Header Kantar logo
    slide3.addImage({
      path: '/kantar_logo.png',
      x: 8.0, y: 0.35, w: 1.2, h: 0.27
    });

    slide3.addText('CORE DEMAND & GEOGRAPHIC EXCELLENCE', {
      x: 0.8, y: 0.45, w: 7.0, h: 0.3,
      fontSize: 13, color: COLOR_DARK, bold: true, fontFace: 'Helvetica'
    });
    slide3.addText('Top areas of global delivery and consulting categories.', {
      x: 0.8, y: 0.75, w: 7.0, h: 0.25,
      fontSize: 9, color: COLOR_TEXT_MUTED, fontFace: 'Helvetica'
    });

    // Top lists layout - Left: Geographic Reach, Right: Category Leadership
    // Left column: 0.8 to 4.7 (w = 3.9)
    // Right column: 5.3 to 9.2 (w = 3.9)
    
    // Left Column Card
    slide3.addShape('rect', {
      x: 0.8, y: 1.3, w: 4.0, h: 3.8,
      fill: { color: 'ffffff' }, line: { color: 'e2e8f0', width: 1 }
    });
    slide3.addShape('rect', {
      x: 0.8, y: 1.3, w: 4.0, h: 0.06,
      fill: { color: '0f766e' } // Teal
    });
    slide3.addText('Geographic Reach Footprint', {
      x: 1.0, y: 1.5, w: 3.6, h: 0.3,
      fontSize: 12, color: '0f766e', bold: true, fontFace: 'Helvetica'
    });

    // Bullets for markets
    const marketsBullets = stats.top_markets.slice(0, 5).map(m => {
      return { text: `${m.name} (${m.value} strategic engagements)`, options: { bullet: true, color: COLOR_TEXT_DARK } };
    });
    slide3.addText(marketsBullets, {
      x: 1.0, y: 1.9, w: 3.6, h: 3.0,
      fontSize: 10, lineSpacing: 18, fontFace: 'Helvetica'
    });

    // Right Column Card
    slide3.addShape('rect', {
      x: 5.2, y: 1.3, w: 4.0, h: 3.8,
      fill: { color: 'ffffff' }, line: { color: 'e2e8f0', width: 1 }
    });
    slide3.addShape('rect', {
      x: 5.2, y: 1.3, w: 4.0, h: 0.06,
      fill: { color: 'd97706' } // Amber
    });
    slide3.addText('Category Leadership Portfolio', {
      x: 5.4, y: 1.5, w: 3.6, h: 0.3,
      fontSize: 12, color: 'd97706', bold: true, fontFace: 'Helvetica'
    });

    // Bullets for categories
    const categoriesBullets = stats.top_categories.slice(0, 5).map(c => {
      return { text: `${c.name} (${c.value} models evaluated)`, options: { bullet: true, color: COLOR_TEXT_DARK } };
    });
    slide3.addText(categoriesBullets, {
      x: 5.4, y: 1.9, w: 3.6, h: 3.0,
      fontSize: 10, lineSpacing: 18, fontFace: 'Helvetica'
    });

    // Slide 4: Capability Highlights & Recommended Experience (Additional Slide)
    const slide4 = pptx.addSlide();
    slide4.background = { fill: COLOR_LIGHT_BG };

    // Accent bar
    slide4.addShape('rect', {
      x: 0, y: 0, w: 10.0, h: 0.1,
      fill: { color: COLOR_PRIMARY }
    });

    // Header Kantar logo
    slide4.addImage({
      path: '/kantar_logo.png',
      x: 8.0, y: 0.35, w: 1.2, h: 0.27
    });

    slide4.addText('CAPABILITY HIGHLIGHTS & STRATEGIC INSIGHTS', {
      x: 0.8, y: 0.45, w: 7.0, h: 0.3,
      fontSize: 13, color: COLOR_DARK, bold: true, fontFace: 'Helvetica'
    });
    slide4.addText('Methodology highlights and recommended strategic focus areas.', {
      x: 0.8, y: 0.75, w: 7.0, h: 0.25,
      fontSize: 9, color: COLOR_TEXT_MUTED, fontFace: 'Helvetica'
    });

    // Left Column Card: Capability Highlights
    slide4.addShape('rect', {
      x: 0.8, y: 1.3, w: 4.0, h: 3.8,
      fill: { color: 'ffffff' }, line: { color: 'e2e8f0', width: 1 }
    });
    slide4.addShape('rect', {
      x: 0.8, y: 1.3, w: 4.0, h: 0.06,
      fill: { color: '4f46e5' } // Indigo
    });
    slide4.addText('Capability Highlights', {
      x: 1.0, y: 1.5, w: 3.6, h: 0.3,
      fontSize: 12, color: '4f46e5', bold: true, fontFace: 'Helvetica'
    });

    const highlightsBullets = [
      { text: `Multi-Dimensional Category Mapping\nModeling complex growth dependencies across ${stats.total_categories} strategic business verticals.`, options: { bullet: true, color: COLOR_TEXT_DARK } },
      { text: `Global Sovereign Footprint\nOperations and custom consumer behavior insights verified across ${stats.total_markets} international markets.`, options: { bullet: true, color: COLOR_TEXT_DARK } },
      { text: `Performance Metric Frameworks\nAdvanced tracking of key metrics to provide strategic, boardroom-ready answers.`, options: { bullet: true, color: COLOR_TEXT_DARK } }
    ];
    slide4.addText(highlightsBullets, {
      x: 1.0, y: 1.9, w: 3.6, h: 3.0,
      fontSize: 9, lineSpacing: 14, fontFace: 'Helvetica'
    });

    // Right Column Card: Recommended Experience
    slide4.addShape('rect', {
      x: 5.2, y: 1.3, w: 4.0, h: 3.8,
      fill: { color: 'ffffff' }, line: { color: 'e2e8f0', width: 1 }
    });
    slide4.addShape('rect', {
      x: 5.2, y: 1.3, w: 4.0, h: 0.06,
      fill: { color: 'db2777' } // Pink/rose
    });
    slide4.addText('Recommended Experience', {
      x: 5.4, y: 1.5, w: 3.6, h: 0.3,
      fontSize: 12, color: 'db2777', bold: true, fontFace: 'Helvetica'
    });

    const recommendationsBullets = [
      { text: `Cross-Market FMCG Pricing & Brand Equity\nAnalytical models targeting pricing elasticities and spontaneous brand recovery metrics.`, options: { bullet: true, color: COLOR_TEXT_DARK } },
      { text: `Advanced Competitive Equity Mapping\nEvaluates mental market share, spontaneous recall, and brand salience metrics.`, options: { bullet: true, color: COLOR_TEXT_DARK } },
      { text: `Client Proposal Alignment\nDirect mapping of historical consumer behavioral coordinates to back client briefs.`, options: { bullet: true, color: COLOR_TEXT_DARK } }
    ];
    slide4.addText(recommendationsBullets, {
      x: 5.4, y: 1.9, w: 3.6, h: 3.0,
      fontSize: 9, lineSpacing: 14, fontFace: 'Helvetica'
    });

    // Slide 5: Thank You slide (Premium light theme)
    const slide5 = pptx.addSlide();
    slide5.background = { fill: COLOR_LIGHT_BG };

    // Accent bar
    slide5.addShape('rect', {
      x: 0, y: 0, w: 10.0, h: 0.1,
      fill: { color: COLOR_PRIMARY }
    });

    // Centered Kantar logo
    slide5.addImage({
      path: '/kantar_logo.png',
      x: 4.1, y: 1.8, w: 1.8, h: 0.4
    });

    slide5.addText('Thank You', {
      x: 1.0, y: 2.6, w: 8.0, h: 0.6,
      fontSize: 32, color: COLOR_DARK, bold: true, align: 'center', fontFace: 'Helvetica'
    });
    slide5.addText('Kantar Capability Intelligence Platform', {
      x: 1.0, y: 3.3, w: 8.0, h: 0.4,
      fontSize: 14, color: 'd97706', bold: true, align: 'center', fontFace: 'Helvetica'
    });
    
    // Centered Divider
    slide5.addShape('rect', {
      x: 4.0, y: 3.9, w: 2.0, h: 0.02,
      fill: { color: 'cbd5e1' }
    });

    slide5.addText('Strategic Analytics Division • Business Strategy & Analytics', {
      x: 1.0, y: 4.2, w: 8.0, h: 0.4,
      fontSize: 11, color: COLOR_TEXT_MUTED, align: 'center', fontFace: 'Helvetica'
    });

    // Save PPTX trigger file download
    pptx.writeFile({ fileName: 'kantar_capability_intelligence_profile.pptx' });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse select-none">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-44 bg-muted rounded-2xl" />
        <div className="h-80 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 text-center text-xs text-destructive bg-destructive/10 rounded-xl border border-destructive/25 font-bold">
        {error || 'No stats data available.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none print:p-0 animate-in fade-in duration-200">
      
      {/* Main printable report body */}
      <div className="glass-panel p-8 rounded-3xl space-y-8 bg-card print:border-0 print:shadow-none print:p-0">
        
        {/* Report cover banner with integrated action buttons */}
        <div className="border-b border-border/80 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <img 
                src="/kantar_logo.png" 
                alt="Kantar" 
                className="h-7 w-auto object-contain dark:invert select-none pointer-events-none" 
              />
              <span>Capability Profile</span>
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-semibold">
              This capability document establishes our verified strategy engagements and execution footprints. All telemetry is dynamically compiled from the master credential database.
            </p>
          </div>
          
          {/* Action buttons integrated directly inside the card header */}
          <div className="flex items-center gap-2 shrink-0 print:hidden pb-1">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 bg-secondary border border-border text-[10px] font-bold rounded-lg hover:bg-secondary/85 cursor-pointer transition-all uppercase tracking-widest"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            
            <button
              onClick={handleExportPPTX}
              className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground font-bold text-[10px] rounded-lg hover:opacity-95 shadow-md cursor-pointer transition-all uppercase tracking-widest"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Download PowerPoint</span>
            </button>
          </div>
        </div>

        {/* Visual Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          <div className="p-5 rounded-2xl bg-[#EEF2FF] dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/35 space-y-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400">
              <Award className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700/80 dark:text-indigo-300/80">Credentials</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-indigo-950 dark:text-indigo-100 tracking-tight">{stats.total_projects}</p>
              <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 font-bold mt-0.5">Verified Case Results</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 space-y-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
              <Building className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">Partners</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-emerald-950 dark:text-emerald-100 tracking-tight">{stats.total_clients}</p>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-bold mt-0.5">Unique Clients</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFFBEB] dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/35 space-y-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
              <Layers className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">Brands</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber-950 dark:text-amber-100 tracking-tight">{stats.total_brands}</p>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-bold mt-0.5">Brands Modelled</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF5FF] dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/35 space-y-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-center text-purple-600 dark:text-purple-400">
              <Globe className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700/80 dark:text-purple-300/80">Markets</span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-purple-950 dark:text-purple-100 tracking-tight">{stats.total_markets}</p>
              <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 font-bold mt-0.5">Sovereign Regions</p>
            </div>
          </div>
        </div>

        {/* Narrative Capability Text Box */}
        <div className="p-6 rounded-2xl border border-border bg-[#F8FAFC] dark:bg-zinc-900/20 space-y-3">
          <div className="flex items-center gap-1.5 text-muted-foreground font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-foreground">Executive Overview & Experience Footprint</span>
          </div>
          <p className="text-xs text-foreground font-semibold leading-relaxed">
            "Over years of global client delivery, Kantar's Business Strategy & Analytics teams have successfully compiled{' '}
            <strong className="text-foreground font-black">{stats.total_projects} verified consulting credentials</strong> across{' '}
            <strong className="text-indigo-600 dark:text-indigo-400 font-black">{stats.total_clients} distinct client partners</strong> and{' '}
            <strong className="text-indigo-600 dark:text-indigo-400 font-black">{stats.total_brands} brands</strong>. 
            We have established deep domain credentials in{' '}
            <strong className="text-teal-700 dark:text-teal-550 font-black">{stats.total_markets} global markets</strong>, 
            tracking performance dependent variables across{' '}
            <strong className="text-amber-700 dark:text-amber-500 font-black">{stats.total_categories} research categories</strong>."
          </p>
        </div>

        {/* Detail listings split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
          
          {/* Top Markets covered */}
          <div className="space-y-4 bg-white dark:bg-zinc-900/40 p-6 rounded-2xl border border-border/85 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-foreground">Geographic Expertise</h3>
              </div>
              <span className="text-[9px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-extrabold px-2 py-0.5 rounded border border-teal-200/40 uppercase tracking-wider">Markets</span>
            </div>
            <div className="space-y-2">
              {stats.top_markets.slice(0, 6).map((m, idx) => {
                const maxVal = stats.top_markets[0]?.value || 1;
                const percentage = Math.round((m.value / maxVal) * 100);
                return (
                  <div key={idx} className="relative flex justify-between items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    {/* Background Progress Bar Fill */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-teal-500/5 dark:bg-teal-500/10 rounded-l-md pointer-events-none transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                      <span className="font-semibold text-foreground/90">{m.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 relative z-10">{m.value} cases</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Categories */}
          <div className="space-y-4 bg-white dark:bg-zinc-900/40 p-6 rounded-2xl border border-border/85 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-foreground">Category Expertise</h3>
              </div>
              <span className="text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded border border-amber-200/40 uppercase tracking-wider">Sectors</span>
            </div>
            <div className="space-y-2">
              {stats.top_categories.slice(0, 6).map((c, idx) => {
                const maxVal = stats.top_categories[0]?.value || 1;
                const percentage = Math.round((c.value / maxVal) * 100);
                return (
                  <div key={idx} className="relative flex justify-between items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-amber-500/5 dark:bg-amber-500/10 rounded-l-md pointer-events-none transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                      <span className="font-semibold text-foreground/90">{c.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 relative z-10">{c.value} cases</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Clients */}
          <div className="space-y-4 bg-white dark:bg-zinc-900/40 p-6 rounded-2xl border border-border/85 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-foreground">Client Experience</h3>
              </div>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded border border-indigo-200/40 uppercase tracking-wider">Top Clients</span>
            </div>
            <div className="space-y-2">
              {stats.top_clients.slice(0, 6).map((cl, idx) => {
                const maxVal = stats.top_clients[0]?.value || 1;
                const percentage = Math.round((cl.value / maxVal) * 100);
                return (
                  <div key={idx} className="relative flex justify-between items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-l-md pointer-events-none transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                      <span className="font-semibold text-foreground/90">{cl.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 relative z-10">{cl.value} studies</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top KPIs */}
          <div className="space-y-4 bg-white dark:bg-zinc-900/40 p-6 rounded-2xl border border-border/85 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-foreground">KPI Experience</h3>
              </div>
              <span className="text-[9px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded border border-rose-200/40 uppercase tracking-wider">Variables</span>
            </div>
            <div className="space-y-2">
              {stats.top_kpis.slice(0, 6).map((k, idx) => {
                const maxVal = stats.top_kpis[0]?.value || 1;
                const percentage = Math.round((k.value / maxVal) * 100);
                return (
                  <div key={idx} className="relative flex justify-between items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-rose-500/5 dark:bg-rose-500/10 rounded-l-md pointer-events-none transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                      <span className="font-semibold text-foreground/90">{k.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 relative z-10">{k.value} models</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Capability Highlights and Recommended Experience Footprint */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border/40">
          
          <div className="space-y-4 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/10 border border-border shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-xs transition-all duration-200">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Capability Highlights</span>
            </h3>
            <div className="space-y-4 text-[11px] text-muted-foreground leading-relaxed font-semibold">
              <div className="space-y-1">
                <p className="text-foreground font-extrabold text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Multi-Dimensional Category Mapping</span>
                </p>
                <p className="pl-5 text-muted-foreground/85">Modeling complex growth dependencies across {stats.total_categories} strategic business verticals.</p>
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-extrabold text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Global Sovereign Footprint</span>
                </p>
                <p className="pl-5 text-muted-foreground/85">Operations and custom consumer behavior insights verified across {stats.total_markets} international markets.</p>
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-extrabold text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Performance Metric Frameworks</span>
                </p>
                <p className="pl-5 text-muted-foreground/85">Advanced tracking of {stats.total_kpis} performance KPIs to provide strategic, boardroom-ready answers.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/10 border border-border shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-xs transition-all duration-200">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Recommended Experience</span>
            </h3>
            <div className="space-y-4 text-[11px] text-muted-foreground leading-relaxed font-semibold">
              <div className="space-y-1">
                <p className="text-foreground font-extrabold text-xs flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Cross-Market FMCG Pricing & Brand Equity</span>
                </p>
                <p className="pl-5 text-muted-foreground/85">Analytical models targeting pricing elasticities and spontaneous brand recovery metrics across sovereign trade lines.</p>
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-extrabold text-xs flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Advanced Competitive Equity Mapping</span>
                </p>
                <p className="pl-5 text-muted-foreground/85">Evaluates mental market share, Spontaneous recall, and brand salience metrics comparing global competitors.</p>
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-extrabold text-xs flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Client Proposal Alignment</span>
                </p>
                <p className="pl-5 text-muted-foreground/85">Direct mapping of historical consumer behavioral coordinates to back client briefs with verified execution evidence.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer verification block */}
        <div className="pt-6 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between font-semibold">
          <span>Kantar Capability Profile • Compiled: {new Date().toLocaleDateString()}</span>
          <span>Strategic Analytics Division • Business Strategy & Analytics</span>
        </div>

      </div>
    </div>
  );
}
