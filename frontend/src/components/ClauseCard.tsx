import React, { useState } from 'react';
import { Clause } from '../types/clause';
import { RiskBadge } from './RiskBadge';
import { AlertTriangle, Tag, Link2, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface ClauseCardProps {
  clause: Clause;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({ clause }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleJumpToConflict = (conflictId: string) => {
    const targetEl = document.getElementById(`clause-${conflictId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('clause-highlight');
      setTimeout(() => {
        targetEl.classList.remove('clause-highlight');
      }, 2500);
    }
  };

  return (
    <div
      id={`clause-${clause.id}`}
      className="editorial-card rounded-lg p-5 border space-y-3.5 transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0a1128] text-amber-400 font-semibold border border-[#1e293b]">
            {clause.id}
          </span>
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            {clause.category}
          </span>
        </div>
        <RiskBadge level={clause.riskLevel} />
      </div>

      {/* Prominent Plain Language Rewrite (Shown by default) */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Plain English Summary
        </div>
        <p className="text-sm text-slate-100 font-sans leading-relaxed">
          {clause.plainLanguage || clause.text}
        </p>
      </div>

      {/* Expandable Original Verbatim Text Toggle */}
      <div className="pt-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-amber-400/90 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{isExpanded ? 'Hide verbatim original wording' : 'Show verbatim original wording'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-2.5 p-3 rounded bg-[#0a1128] border border-[#1e293b]">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Verbatim Contract Wording
            </div>
            <p className="text-xs text-slate-300 font-serif leading-relaxed italic">
              "{clause.text}"
            </p>
          </div>
        )}
      </div>

      {/* Risk Assessment Explanation */}
      {clause.riskReason && (
        <div className="flex items-start gap-2 text-xs text-amber-200/90 bg-[#2d1b06] p-2.5 rounded border border-[#78350f]">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Risk Note: </span>
            {clause.riskReason}
          </div>
        </div>
      )}

      {/* Inline Flag for Conflicting Clauses with Jump Links */}
      {clause.conflictsWith && clause.conflictsWith.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-[#1e293b]">
          <Link2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 font-medium">Contradicts Clause: </span>
          <div className="flex gap-1.5">
            {clause.conflictsWith.map((conflictId) => (
              <button
                key={conflictId}
                onClick={() => handleJumpToConflict(conflictId)}
                className="px-2 py-0.5 rounded bg-[#3f1616] text-red-300 border border-[#7f1d1d] font-mono text-[11px] font-semibold hover:bg-red-900/60 transition-colors cursor-pointer flex items-center gap-1"
                title={`Click to jump to conflicting clause ${conflictId}`}
              >
                <span>{conflictId}</span>
                <span className="text-[9px] underline">Jump</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
