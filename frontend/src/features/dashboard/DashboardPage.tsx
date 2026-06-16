import React, { useEffect, useState } from 'react';
import { 
  FolderOpen, 
  Building, 
  Tag, 
  Globe, 
  Layers, 
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import api from '../../services/api';
import { DashboardStats } from '../../types';

const COLORS = ['#3b82f6', '#6366f1', '#0d9488', '#d97706', '#e11d48', '#64748b'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch dashboard metrics.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-96 bg-muted rounded-xl" />
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20 font-bold">
        {error || 'No stats data available.'}
      </div>
    );
  }

  const statItems = [
    { label: "Total Projects", val: stats.total_projects, icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Clients", val: stats.total_clients, icon: Building, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
    { label: "Total Brands", val: stats.total_brands, icon: Tag, color: "text-indigo-500", bg: "bg-indigo-5/50 dark:bg-indigo-500/10" },
    { label: "Total Markets", val: stats.total_markets, icon: Globe, color: "text-teal-500", bg: "bg-teal-5/50 dark:bg-teal-500/10" },
    { label: "Total Categories", val: stats.total_categories, icon: Layers, color: "text-amber-500", bg: "bg-amber-5/50 dark:bg-amber-500/10" },
    { label: "Total KPIs", val: stats.total_kpis, icon: Activity, color: "text-rose-500", bg: "bg-rose-5/50 dark:bg-rose-500/10" }
  ];

  return (
    <div className="space-y-8 select-none">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Executive Dashboard</h2>
        <p className="text-xs text-muted-foreground font-semibold mt-1">
          High-level overview of our institutional capacity and business distribution.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {statItems.map((item, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-2xl flex flex-col justify-between shadow-xs hover:border-primary/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight">{item.val}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Top Clients Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold">Top Clients</h3>
            <p className="text-[11px] text-muted-foreground font-semibold">Volume of project rows associated with each client</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.top_clients}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156,163,175,0.15)" />
                <XAxis dataKey="name" stroke="#888888" tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'none' }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Distribution Area Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold">Market Distribution</h3>
            <p className="text-[11px] text-muted-foreground font-semibold">Total active project dimensions across target regions</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.top_markets}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156,163,175,0.15)" />
                <XAxis dataKey="name" stroke="#888888" tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'none' }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Area type="monotone" dataKey="value" stroke="#0d9488" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI Distribution (Pie Chart) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold">KPI Modeling Distribution</h3>
            <p className="text-[11px] text-muted-foreground font-semibold">Share of dependent variables modeled across studies</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.top_kpis}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.top_kpis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'none' }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution (Horizontal Bar Chart) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold">Category Distribution</h3>
            <p className="text-[11px] text-muted-foreground font-semibold">Top business sectors by project frequency</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.top_categories.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(156,163,175,0.15)" />
                <XAxis type="number" stroke="#888888" tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888888" tickLine={false} axisLine={false} width={120} />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'none' }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
