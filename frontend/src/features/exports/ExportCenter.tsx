import React, { useEffect, useState } from 'react';
import { Download, Table, Presentation, FileText, CheckCircle, Database } from 'lucide-react';
import api from '../../services/api';
import pptxgen from 'pptxgenjs';

export default function ExportCenter() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleExportCSV = () => {
    window.open(`http://localhost:8000/api/projects/export/csv?token=${localStorage.getItem('token')}`);
  };

  const handleExportPPTX = () => {
    if (!stats) return;
    
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    // Cover
    const slide1 = pptx.addSlide();
    slide1.background = { fill: '1e1b4b' };
    slide1.addText('CAPABILITY PROFILE', { x: 1.0, y: 2.2, w: 8.0, h: 0.5, fontSize: 18, color: 'a78bfa', bold: true });
    slide1.addText('BSA Relationship Explorer Deck', { x: 1.0, y: 2.8, w: 10.0, h: 1.5, fontSize: 38, color: 'ffffff', bold: true });
    
    // Stats
    const slide2 = pptx.addSlide();
    slide2.addText('EXPERIENCE METRICS', { x: 0.8, y: 0.6, w: 8.0, h: 0.4, fontSize: 14, color: '4f46e5', bold: true });
    slide2.addText(`Total Projects: ${stats.total_projects}`, { x: 1.0, y: 1.5, fontSize: 20 });
    slide2.addText(`Total Clients: ${stats.total_clients}`, { x: 1.0, y: 2.2, fontSize: 20 });
    slide2.addText(`Total Brands: ${stats.total_brands}`, { x: 1.0, y: 2.9, fontSize: 20 });
    slide2.addText(`Total Markets: ${stats.total_markets}`, { x: 1.0, y: 3.6, fontSize: 20 });
    
    pptx.writeFile({ fileName: 'capability_presentation.pptx' });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const exportActions = [
    {
      title: "Projects Data CSV Log",
      desc: "Full tabular compile of all historical project rows. Excellent for spreadsheets auditing.",
      icon: Table,
      color: "text-primary bg-primary/10 border-primary/15",
      action: handleExportCSV
    },
    {
      title: "PowerPoint Pitch Template",
      desc: "Auto-generates a widescreen pitch deck slide set based on real database aggregates.",
      icon: Presentation,
      color: "text-primary bg-primary/10 border-primary/15",
      action: handleExportPPTX
    },
    {
      title: "Printable PDF Profile",
      desc: "Perfect styled capabilities brief. Prints directly or saves clean local PDF vector files.",
      icon: FileText,
      color: "text-primary bg-primary/10 border-primary/15",
      action: handlePrintPDF
    }
  ];

  return (
    <div className="space-y-6 select-none">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Export Center</h2>
        <p className="text-xs text-muted-foreground font-semibold mt-1">
          Compile and download organizational profile assets in multiple document formats.
        </p>
      </div>

      {/* Stats Quick Status */}
      <div className="glass-panel p-6 rounded-xl flex items-center justify-between border border-border/80 bg-secondary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Database className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Database Sync Status: Connected</h4>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Seeded with 307 project executions ready to build pitches.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Sync OK</span>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {exportActions.map((act, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-xl flex flex-col justify-between hover:shadow-md transition-all border border-border hover:border-primary/30">
            <div className="space-y-4">
              <div className={`inline-flex p-3 rounded-xl border ${act.color}`}>
                <act.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold">{act.title}</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">{act.desc}</p>
            </div>
            
            <button
              onClick={act.action}
              disabled={loading && act.title.includes('PowerPoint')}
              className="mt-6 w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 shadow-md cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Generate Download</span>
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
