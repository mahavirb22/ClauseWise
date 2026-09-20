import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { ClauseCard } from '../components/ClauseCard';
import { fetchClauses, extractClausesForDoc } from '../api/clauses';
import { ClausesResponse, RiskLevel } from '../types/clause';
import { Filter, Loader2, Play } from 'lucide-react';

export const ClausesPage: React.FC = () => {
  const [docId, setDocId] = useState('doc-rental-sample');
  const [data, setData] = useState<ClausesResponse | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunExtraction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await extractClausesForDoc(docId);
      setData(res);
    } catch (err: any) {
      // Fallback to fetch existing clauses if doc already extracted
      try {
        const fetchRes = await fetchClauses({ docId, riskLevel: selectedRisk === 'ALL' ? undefined : selectedRisk });
        setData(fetchRes);
      } catch (fetchErr: any) {
        setError(err.message || 'Failed to extract clauses');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunExtraction();
  }, [selectedRisk]);

  return (
    <div className="space-y-6">
      <Header
        title="Structured Clause Extraction & Conflict Analysis"
        description="Extract verbatim clauses, plain English summaries, risk ratings, and intra-document contradictions."
      />

      <form onSubmit={handleRunExtraction} className="editorial-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-grow max-w-md">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Doc ID:
          </label>
          <input
            type="text"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className="bg-[#0a1128] border border-[#1e293b] rounded-md px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 w-full"
            placeholder="e.g. doc-8942"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <Play className="w-3.5 h-3.5 text-slate-950 fill-current" />}
            Extract
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Filter:</span>
          <div className="flex flex-wrap gap-1.5 ml-2">
            {(['ALL', 'high', 'medium', 'low'] as const).map((level) => (
              <button
                type="button"
                key={level}
                onClick={() => setSelectedRisk(level as any)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedRisk === level
                    ? 'bg-amber-600 text-slate-950 font-semibold'
                    : 'bg-[#0a1128] text-slate-400 hover:text-slate-200 border border-[#1e293b]'
                }`}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </form>

      {loading && (
        <div className="editorial-panel rounded-lg p-12 text-center text-slate-400 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Running Gemini structured clause extraction & contradiction detection...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-[#3f1616] border border-[#7f1d1d] text-red-200 space-y-3">
          <div className="text-sm font-medium">{error}</div>
          <button
            onClick={() => handleRunExtraction()}
            className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 border border-red-700 text-xs text-red-100 font-semibold transition-colors flex items-center gap-1.5"
          >
            Retry Extraction
          </button>
        </div>
      )}

      {data && data.isLegalDocument === false && !loading && (
        <div className="editorial-panel rounded-lg p-6 space-y-2 border-l-4 border-l-amber-500">
          <h3 className="text-sm font-serif font-semibold text-amber-300">Non-Legal Document Detected</h3>
          <p className="text-xs text-slate-300">
            {data.nonLegalWarning || "This document does not appear to be a legal contract or agreement."}
          </p>
        </div>
      )}

      {data && data.isLegalDocument !== false && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {data.clauses.length} clauses for Document <code className="text-amber-400 font-mono">{data.docId}</code></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.clauses.map((clause) => (
              <ClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
