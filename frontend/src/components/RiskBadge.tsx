import React from 'react';
import { RiskLevel } from '../types/clause';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  const normLevel = (level || 'low').toString().toLowerCase();

  const getBadgeStyle = (risk: string) => {
    switch (risk) {
      case 'critical':
      case 'high':
        // Muted brick red
        return 'bg-[#3b1212] text-[#fca5a5] border-[#7f1d1d]';
      case 'medium':
        // Warm amber
        return 'bg-[#3f2206] text-[#fde68a] border-[#78350f]';
      case 'low':
        // Muted sage green
        return 'bg-[#042f2e] text-[#a7f3d0] border-[#065f46]';
      default:
        return 'bg-[#1e293b] text-slate-300 border-[#334155]';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase border ${getBadgeStyle(
        normLevel
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {normLevel} Risk
    </span>
  );
};
