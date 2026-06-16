import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Building, 
  Tag, 
  Layers, 
  Globe, 
  Activity,
  Award
} from 'lucide-react';

interface CustomNodeProps {
  data: {
    label: string;
    type: 'CLIENT' | 'BRAND' | 'CATEGORY' | 'MARKET' | 'KPI';
    score?: number;
  };
  selected?: boolean;
}

const CustomNode = ({ data, selected }: CustomNodeProps) => {
  const getTypeConfig = () => {
    switch (data.type) {
      case 'CLIENT':
        return {
          bg: 'bg-slate-100 dark:bg-slate-900',
          border: selected ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-300 dark:border-slate-800 hover:border-slate-400',
          text: 'text-slate-600 dark:text-slate-400',
          icon: Building,
          badge: 'CLIENT'
        };
      case 'BRAND':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950',
          border: selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-indigo-200 dark:border-indigo-900 hover:border-indigo-400',
          text: 'text-indigo-600 dark:text-indigo-400',
          icon: Tag,
          badge: 'BRAND'
        };
      case 'CATEGORY':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950',
          border: selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-200 dark:border-amber-900 hover:border-amber-400',
          text: 'text-amber-700 dark:text-amber-500',
          icon: Layers,
          badge: 'CATEGORY'
        };
      case 'MARKET':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950',
          border: selected ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-teal-200 dark:border-teal-900 hover:border-teal-400',
          text: 'text-teal-700 dark:text-teal-500',
          icon: Globe,
          badge: 'MARKET'
        };
      case 'KPI':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950',
          border: selected ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-rose-200 dark:border-rose-900 hover:border-rose-400',
          text: 'text-rose-700 dark:text-rose-400',
          icon: Activity,
          badge: 'KPI'
        };
      default:
        return {
          bg: 'bg-card',
          border: 'border-border',
          text: 'text-foreground',
          icon: Award,
          badge: 'UNKNOWN'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 w-56 shadow-sm [transition:background-color_0.2s_ease-in-out,border-color_0.2s_ease-in-out,color_0.2s_ease-in-out,box-shadow_0.2s_ease-in-out] select-none ${config.bg} ${config.border}`}>
      
      {/* Target connection point (left side) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: 'currentColor' }} 
        className={config.text}
      />
      
      {/* Custom Icon */}
      <div className={`p-1.5 rounded-lg border bg-card shrink-0 ${config.text} border-current/10`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Label and Badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-75 truncate">
            {config.badge}
          </span>
          {data.score !== undefined && (
            <span className="text-[9px] font-bold text-muted-foreground">
              Rank: {Math.round(data.score)}
            </span>
          )}
        </div>
        <h4 className="text-xs font-bold truncate mt-0.5">{data.label}</h4>
      </div>

      {/* Source connection point (right side) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: 'currentColor' }}
        className={config.text}
      />
    </div>
  );
};

export default memo(CustomNode);
