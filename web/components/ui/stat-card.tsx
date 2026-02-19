import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlight?: boolean;
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  highlight = false,
  className = ''
}: StatCardProps) {
  return (
    <div className={`glass-panel p-6 group hover:border-cyan-500/30 transition-all duration-300 ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-slate-400 text-sm font-mono uppercase tracking-tighter">
          {title}
        </p>
        {Icon && (
          <Icon className={`w-5 h-5 ${highlight ? 'text-orange-400' : 'text-cyan-400'}`} />
        )}
      </div>
      
      <p className={`text-3xl font-bold mb-2 ${highlight ? 'text-orange-400' : 'text-white'}`}>
        {value}
      </p>
      
      {trend && (
        <div className={`text-sm flex items-center gap-1 ${
          trend.isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
