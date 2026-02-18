import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import Badge from '../ui/badge';

interface AIInsightCardProps {
  recommendation: 'approve' | 'reject' | 'review' | 'escalate';
  confidence: number;
  violations?: string[];
  suggestions?: string[];
  reasoning?: string;
}

const recommendationConfig = {
  approve: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Approve'
  },
  reject: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Reject'
  },
  review: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Needs Review'
  },
  escalate: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'Escalate'
  }
};

export default function AIInsightCard({
  recommendation,
  confidence,
  violations = [],
  suggestions = [],
  reasoning
}: AIInsightCardProps) {
  const config = recommendationConfig[recommendation];
  const Icon = config.icon;

  return (
    <div className={`glass-panel p-6 border-l-4 ${config.borderColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Recommendation</h3>
            <p className="text-xs text-slate-400">Powered by Multi-LLM Engine</p>
          </div>
        </div>
        <Badge variant={recommendation === 'approve' ? 'approved' : 
                       recommendation === 'reject' ? 'rejected' : 
                       recommendation === 'escalate' ? 'escalated' : 'pending'}>
          {config.label}
        </Badge>
      </div>

      {/* Confidence Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Confidence Score</span>
          <span className="text-sm font-mono text-white">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              confidence >= 0.8 ? 'bg-green-500' : 
              confidence >= 0.6 ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Reasoning */}
      {reasoning && (
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-300">{reasoning}</p>
        </div>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
            <Icon className="w-4 h-4" />
            Policy Violations ({violations.length})
          </h4>
          <ul className="space-y-1">
            {violations.map((violation, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>{violation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Suggestions ({suggestions.length})
          </h4>
          <ul className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
