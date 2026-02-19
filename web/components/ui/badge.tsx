import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'escalated' | 'active' | 'inactive' | 'draft' | 'completed' | 'in_progress' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
  escalated: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  active: 'bg-green-500/10 text-green-400 border-green-500/30',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  draft: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  in_progress: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  default: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
