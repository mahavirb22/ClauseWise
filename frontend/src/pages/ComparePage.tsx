import React, { useState } from 'react';
import { Header } from '../components/Header';
import { compareDocuments } from '../api/compare';
import { CompareResponse } from '../types/clause';
import { GitCompare, Loader2, ArrowRight, ShieldAlert, AlertTriangle, PlusCircle } from 'lucide-react';

export const ComparePage: React.FC = () => {
  const [docA, setDocA] = useState('doc-v1-sample');
  const [docB, setDocB] = useState('doc-v2-sample');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docA.trim() || !docB.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await compareDocuments({ docIdA: docA, docIdB: docB });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compare documents');
    } finally {
      setLoading(false);
    }
  };

  const getFavorsIndicator = (favors: string) => {
    const norm = favors.toLowerCase();
    if (norm.includes('doca') || norm === 'a') {
      return {
        borderClass: 'border-l-emerald-500',
        text: 'Favors Document A (Less Risk for User)',
        colorClass: 'text-emerald-400',
      };
    } else if (norm.includes('docb') || norm === 'b') {
      return {
        borderClass: 'border-l-red-500',
        text: 'Favors Document B (Increases Risk for User)',
        colorClass: 'text-red-400',
      };
    }
    return {
      borderClass: 'border-l-slate-600',
      text: 'Neutral Terms Comparison',
      colorClass: 'text-slate-400',
    };
  };

  return (
    <div className="space-y-6">
      <Header
        title="Structured Contract Version Comparison"
        description="Pair corresponding clauses across document revisions, evaluate risk delta, and identify added or missing terms."
      />

      <form onSubmit={handleCompare} className="editorial-panel rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Document A ID (Base / Original Revision)
            </label>
            <input
              type="text"
              value={docA}
              onChange={(e) => setDocA(e.target.value)}
              className="w-full bg-[#0a1128] border border-[#1e293b] rounded-md p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              placeholder="e.g. doc-v1-sample"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Document B ID (Revised / Comparison Revision)
            </label>
            <input
              type="text"
              value={docB}
              onChange={(e) => setDocB(e.target.value)}
              className="w-full bg-[#0a1128] border border-[#1e293b] rounded-md p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              placeholder="e.g. doc-v2-sample"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-md bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              Comparing Clauses & Evaluating Risk Delta...
            </>
          ) : (
            <>
              <GitCompare className="w-4 h-4 text-slate-950" />
              Run Structured Version Comparison
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-[#3f1616] border border-[#7f1d1d] text-red-200 text-xs space-y-3">
          <div>{error}</div>
          <button
            onClick={(e) => handleCompare(e)}
            className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 border border-red-700 text-xs text-red-100 font-semibold transition-colors"
          >
            Retry Version Comparison
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Executive Overview Panel */}
          <div className="editorial-panel rounded-lg p-5 space-y-3.5 border-l-4 border-l-amber-500">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-amber-400 font-semibold">Doc A: {data.docIdA}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-amber-400 font-semibold">Doc B: {data.docIdB}</span>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#0a1128] text-slate-300 border border-[#1e293b]">
                Similarity Score: {(data.similarityScore * 100).toFixed(0)}%
              </span>
            </div>

            <p className="text-sm text-slate-200 font-sans leading-relaxed">
              {data.summary}
            </p>

            {data.overallRecommendation && (
              <div className="p-3 rounded bg-[#2d1b06] border border-[#78350f] text-xs text-amber-200/90 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">Negotiation Strategy: </span>
                  {data.overallRecommendation}
                </div>
              </div>
            )}
          </div>

          {/* Matched Clause Pairs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-serif font-semibold text-slate-200 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-amber-400" />
                Matched Clause Pair Comparisons ({data.pairedComparisons?.length || 0})
              </h3>
            </div>

            <div className="space-y-4">
              {data.pairedComparisons?.map((pair, idx) => {
                const indicator = getFavorsIndicator(pair.favors);
                return (
                  <div
                    key={idx}
                    className={`editorial-card rounded-lg p-5 border-l-4 ${indicator.borderClass} space-y-4`}
                  >
                    <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                        Topic: {pair.topic}
                      </span>
                      <span className={`text-xs font-medium ${indicator.colorClass}`}>
                        {indicator.text}
                      </span>
                    </div>

                    {/* Side-by-side Two-Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-[#0a1128] p-3.5 rounded border border-[#1e293b]">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Document A (Original Term)
                        </div>
                        <p className="text-xs text-slate-300 font-serif leading-relaxed italic">
                          "{pair.docAText}"
                        </p>
                      </div>

                      <div className="space-y-1.5 bg-[#0a1128] p-3.5 rounded border border-[#1e293b]">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Document B (Revised Term)
                        </div>
                        <p className="text-xs text-slate-300 font-serif leading-relaxed italic">
                          "{pair.docBText}"
                        </p>
                      </div>
                    </div>

                    {/* Difference & Risk Delta Analysis */}
                    <div className="space-y-2 pt-2 border-t border-[#1e293b]">
                      <div className="text-xs text-slate-300 bg-[#0a1128]/60 p-2.5 rounded border border-[#1e293b]">
                        <span className="font-semibold text-slate-200">Difference Summary: </span>
                        {pair.differenceSummary}
                      </div>

                      <div className="flex items-start gap-2 text-xs text-amber-200/90 bg-[#2d1b06] p-2.5 rounded border border-[#78350f]">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-300">Risk Delta: </span>
                          {pair.riskDelta}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unmatched Clauses Section ("Only in Document A / Document B") */}
          {data.unilateralClauses && data.unilateralClauses.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#1e293b]">
              <h3 className="text-sm font-serif font-semibold text-slate-200 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                Clauses Present Only in Document A or Document B ({data.unilateralClauses.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.unilateralClauses.map((item, idx) => (
                  <div key={idx} className="editorial-card rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs border-b border-[#1e293b] pb-2">
                      <span className="font-semibold text-amber-400 uppercase tracking-wider">
                        {item.topic}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#0a1128] text-amber-300 border border-[#1e293b] font-mono text-[11px]">
                        Only in {item.presentIn}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic font-serif bg-[#0a1128] p-3 rounded border border-[#1e293b] leading-relaxed">
                      "{item.text}"
                    </p>

                    <div className="text-xs text-slate-400 pt-1">
                      <span className="font-semibold text-slate-300">Legal Impact: </span>
                      {item.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
