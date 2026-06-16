import React, { useEffect, useState, useMemo } from 'react';
import { Download, RefreshCw, Info } from 'lucide-react';
import api from '../../services/api';
import type { CapabilityMatrixResponse, MatrixCell } from '../../types';

export default function CapabilityMatrix() {
  const [rowDim, setRowDim] = useState('market');
  const [colDim, setColDim] = useState('category');
  const [metric, setMetric] = useState<'project_count' | 'coverage_score' | 'expertise_score'>('project_count');
  
  const [data, setData] = useState<CapabilityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Cell hover tooltip state
  const [hoveredCell, setHoveredCell] = useState<{
    row: string;
    col: string;
    count: number;
    coverage: number;
    expertise: number;
    x: number;
    y: number;
    align: 'top' | 'bottom';
  } | null>(null);

  // Fetch matrix dataset when dimension triggers change
  useEffect(() => {
    setLoading(true);
    setError('');
    
    api.get('/insights/matrix', {
      params: { row_dim: rowDim, col_dim: colDim }
    })
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to calculate capability matrix.');
        setLoading(false);
      });
  }, [rowDim, colDim]);

  const handleExportCSV = () => {
    if (!data) return;
    
    // Construct CSV file
    let csvContent = `Dimension Matrix (${rowDim} x ${colDim}),` + data.cols.join(',') + '\n';
    
    // Map cells to a grid dictionary
    const cellMap: Record<string, Record<string, number>> = {};
    data.rows.forEach(r => {
      cellMap[r] = {};
      data.cols.forEach(c => {
        cellMap[r][c] = 0;
      });
    });

    data.cells.forEach(cell => {
      if (cellMap[cell.row_name] !== undefined) {
        cellMap[cell.row_name][cell.col_name] = cell[metric];
      }
    });

    data.rows.forEach(r => {
      const rowVals = data.cols.map(c => cellMap[r][c]);
      csvContent += `"${r}",` + rowVals.join(',') + '\n';
    });

    // Create file trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `matrix_${rowDim}_x_${colDim}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert raw value to color opacity class
  const getCellColor = (val: number, maxVal: number) => {
    if (val === 0 || maxVal === 0) return 'bg-secondary/40 text-muted-foreground/30';
    const ratio = val / maxVal;
    
    if (ratio < 0.25) return 'bg-primary/10 text-primary border border-primary/10';
    if (ratio < 0.5) return 'bg-primary/30 text-primary border border-primary/10';
    if (ratio < 0.75) return 'bg-primary/70 text-white border border-primary/20';
    return 'bg-primary text-white font-extrabold shadow-sm border border-primary/30';
  };

  // Prepare matrix map
  const matrixLookup = useMemo(() => {
    if (!data) return {};
    const map: Record<string, Record<string, MatrixCell>> = {};
    data.cells.forEach(cell => {
      if (!map[cell.row_name]) map[cell.row_name] = {};
      map[cell.row_name][cell.col_name] = cell;
    });
    return map;
  }, [data]);

  // Find max value in dataset for scale color calculations
  const maxMetricValue = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.cells.map(c => c[metric]), 1);
  }, [data, metric]);

  const handleCellHover = (e: React.MouseEvent, row: string, col: string, cellData?: MatrixCell) => {
    if (!cellData) {
      setHoveredCell(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 256; // matches w-64
    const padding = 16;
    
    // Clamp horizontal position so tooltip doesn't overflow viewport edges
    const centerX = rect.left + rect.width / 2;
    const clampedX = Math.max(padding + tooltipWidth / 2, Math.min(window.innerWidth - padding - tooltipWidth / 2, centerX));
    
    // Check if there is enough space above the cell (e.g., 140px)
    const spaceAbove = rect.top;
    const align = spaceAbove < 140 ? 'bottom' : 'top';
    
    // Calculate vertical pivot point depending on alignment
    const y = align === 'top' ? rect.top - 8 : rect.bottom + 8;

    setHoveredCell({
      row,
      col,
      count: cellData.project_count,
      coverage: cellData.coverage_score,
      expertise: cellData.expertise_score,
      x: clampedX,
      y,
      align
    });
  };

  return (
    <div className="space-y-6 select-none relative animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight font-serif text-foreground">Expertise Coverage Matrix</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Visualize and evaluate Kantar's capabilities and analytical footprint density across sectors, markets, and KPI frameworks.
          </p>
        </div>
        
        <button
          onClick={handleExportCSV}
          disabled={!data}
          className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 shadow-md cursor-pointer disabled:opacity-40 select-none shrink-0 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Matrix CSV</span>
        </button>
      </div>

      {/* Executive Insights Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <div className="p-4 rounded-xl border border-teal-500/15 bg-teal-500/[0.02] space-y-1">
          <p className="text-[9px] text-teal-600 dark:text-teal-400 font-extrabold uppercase tracking-wider">Project Count</p>
          <p className="text-xs text-foreground font-bold font-serif">Volume Footprint</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
            Displays the total sum of completed consulting engagements, signaling our absolute experience density and sector depth.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.02] space-y-1">
          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider">Coverage %</p>
          <p className="text-xs text-foreground font-bold font-serif">Credential Penetration</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
            Portrays active market and KPI support rates, helping you spot whitespace gaps or highly standardized model frameworks.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/15 bg-rose-500/[0.02] space-y-1">
          <p className="text-[9px] text-rose-600 dark:text-rose-400 font-extrabold uppercase tracking-wider">Expertise Score</p>
          <p className="text-xs text-foreground font-bold font-serif">Consolidated Authority Index</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
            Combines client multi-market frequency, relational ranks, and modeling complexity into a high-level authority score.
          </p>
        </div>
      </div>

      {/* Select matrix dimensions & metrics */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Row Dim:</span>
            <select
              value={rowDim}
              onChange={e => setRowDim(e.target.value)}
              className="px-2 py-1 border border-border bg-card rounded-md cursor-pointer outline-hidden"
            >
              <option value="market">Market</option>
              <option value="category">Category</option>
              <option value="client">Client</option>
            </select>
          </div>

          <span className="text-muted-foreground">×</span>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Col Dim:</span>
            <select
              value={colDim}
              onChange={e => setColDim(e.target.value)}
              className="px-2 py-1 border border-border bg-card rounded-md cursor-pointer outline-hidden"
            >
              <option value="category">Category</option>
              <option value="kpi">KPI Metric</option>
              <option value="market">Market</option>
            </select>
          </div>
        </div>

        {/* Matrix Cell metric selectors */}
        <div className="flex rounded-lg border border-border p-1 bg-card">
          <button
            onClick={() => setMetric('project_count')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-colors ${metric === 'project_count' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Project Count
          </button>
          <button
            onClick={() => setMetric('coverage_score')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-colors ${metric === 'coverage_score' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Coverage %
          </button>
          <button
            onClick={() => setMetric('expertise_score')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-colors ${metric === 'expertise_score' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Expertise Score
          </button>
        </div>
      </div>

      {/* Grid Heatmap Board */}
      {loading ? (
        <div className="h-96 w-full flex flex-col items-center justify-center bg-card rounded-2xl border border-border">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-xs font-bold text-muted-foreground animate-pulse">Calculating heatmap layout...</p>
        </div>
      ) : error || !data ? (
        <div className="p-6 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20 font-bold">
          {error || 'Matrix data not available.'}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-border overflow-hidden">
          <div className="overflow-auto max-w-full max-h-[60vh]">
            <table className="border-collapse w-max min-w-full select-none text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/35">
                  <th className="p-3 sticky left-0 z-30 bg-card border-r border-border font-bold text-[10px] text-muted-foreground uppercase tracking-wider min-w-[150px]">
                    {rowDim} \ {colDim}
                  </th>
                  {data.cols.map(c => (
                    <th key={c} className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center min-w-[100px]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.rows.map(r => (
                  <tr key={r} className="hover:bg-secondary/15">
                    <td className="p-3 sticky left-0 z-20 bg-card border-r border-border font-extrabold text-[11px] truncate max-w-[160px] shadow-sm">
                      {r}
                    </td>
                    
                    {data.cols.map(c => {
                      const cell = matrixLookup[r]?.[c];
                      const val = cell ? cell[metric] : 0;
                      
                      return (
                        <td
                          key={c}
                          onMouseEnter={e => handleCellHover(e, r, c, cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`p-3 text-center text-xs font-bold border-r border-border/10 cursor-pointer relative group hover:brightness-95 dark:hover:brightness-105 select-none ${getCellColor(val, maxMetricValue)}`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{metric === 'coverage_score' && cell ? `${val}%` : val}</span>
                            {cell ? (
                              <Info className="w-2.5 h-2.5 opacity-0 lg:group-hover:opacity-80 transition-opacity duration-100 inline-block text-current" />
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating cell tooltip hover card */}
      {hoveredCell && (
        <div 
          style={{ 
            position: 'fixed',
            left: hoveredCell.x, 
            top: hoveredCell.y,
            transform: hoveredCell.align === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
          }}
          className="w-64 bg-popover text-popover-foreground border border-border shadow-2xl p-4 rounded-xl z-50 pointer-events-none space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center gap-1 text-[9px] font-extrabold text-primary uppercase tracking-wider">
            <Info className="w-3.5 h-3.5" />
            <span>Capability Details</span>
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold truncate">{hoveredCell.row}</h4>
            <p className="text-[10px] text-muted-foreground font-semibold truncate">× {hoveredCell.col}</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 border-t border-border/60 pt-2 text-[10px] text-center font-bold">
            <div>
              <div className="text-foreground">{hoveredCell.count}</div>
              <div className="text-[8px] text-muted-foreground uppercase mt-0.5">Projects</div>
            </div>
            <div>
              <div className="text-foreground">{hoveredCell.coverage}%</div>
              <div className="text-[8px] text-muted-foreground uppercase mt-0.5">Coverage</div>
            </div>
            <div>
              <div className="text-foreground">{Math.round(hoveredCell.expertise)}%</div>
              <div className="text-[8px] text-muted-foreground uppercase mt-0.5">Expertise</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
