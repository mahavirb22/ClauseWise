import React, { useState } from 'react';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { fetchNextSteps } from '../api/nextsteps';
import { NextStepsResponse } from '../types/clause';
import { CheckSquare, Loader2, ShieldAlert, ChevronRight, Printer, Copy, HelpCircle, Check, FileText } from 'lucide-react';

export const NextStepsPage: React.FC = () => {
  const [docId, setDocId] = useState('doc-rental-sample');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NextStepsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNextSteps(docId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate action plans');
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (key: string) => {
    setCompletedActions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportBrief = () => {
    if (!data || !data.documentBrief) return;
    
    // Format full clean print/download window content
    const briefContent = `
<!DOCTYPE html>
<html>
<head>
  <title>ClauseWise - Consultation Brief (${data.fileName})</title>
  <style>
    body { font-family: 'Georgia', serif; color: #111; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 5px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 25px; font-family: sans-serif; }
    h2 { font-size: 16px; margin-top: 25px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; font-size: 14px; }
    .rec-box { background: #fdf8f0; border-left: 4px solid #d97706; padding: 12px 16px; margin-top: 20px; font-size: 13px; font-family: sans-serif; }
    .clause-card { border: 1px solid #ddd; padding: 15px; margin-top: 15px; border-radius: 6px; page-break-inside: avoid; }
    .clause-header { font-weight: bold; font-size: 14px; font-family: sans-serif; display: flex; justify-content: space-between; }
    .risk-tag { color: #b91c1c; text-transform: uppercase; font-size: 11px; }
    .snippet { font-style: italic; color: #444; font-size: 13px; margin: 8px 0; background: #f9f9f9; padding: 8px; border-radius: 4px; }
    .section-title { font-weight: bold; font-size: 12px; font-family: sans-serif; text-transform: uppercase; color: #555; margin-top: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>DOCUMENT CONSULTATION BRIEF</h1>
  <div class="meta">Document File: <strong>${data.fileName}</strong> | Doc ID: <strong>${data.docId}</strong> | Date: ${new Date().toLocaleDateString()}</div>
  
  <h2>EXECUTIVE CONSULTATION SUMMARY</h2>
  <ul>
    ${data.documentBrief.map(b => `<li>${b}</li>`).join('')}
  </ul>

  <div class="rec-box">
    <strong>Consultation Strategy:</strong> ${data.executiveRecommendation}
  </div>

  <h2>CLAUSE-BY-CLAUSE ACTION PLAN & LAWYER QUESTIONS</h2>
  ${(data.clauseActionPlans || []).map(plan => `
    <div class="clause-card">
      <div class="clause-header">
        <span>Clause ${plan.clauseId} - ${plan.category}</span>
        <span class="risk-tag">Risk: ${plan.riskLevel}</span>
      </div>
      <div class="snippet">"${plan.verbatimSnippet}"</div>
      
      <div class="section-title">Personal Action Checklist:</div>
      <ul>
        ${plan.actionChecklist.map(item => `<li>[ ] ${item}</li>`).join('')}
      </ul>

      <div class="section-title">Questions for Your Lawyer:</div>
      <ul>
        ${plan.lawyerQuestions.map(q => `<li>? ${q}</li>`).join('')}
      </ul>
    </div>
  `).join('')}

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(briefContent);
      printWin.document.close();
    }
  };

  const handleCopyBrief = () => {
    if (!data || !data.documentBrief) return;
    const textToCopy = [
      `DOCUMENT CONSULTATION BRIEF: ${data.fileName} (${data.docId})`,
      `--------------------------------------------------`,
      ...data.documentBrief.map((b) => `• ${b}`),
      `\nEXECUTIVE RECOMMENDATION:`,
      data.executiveRecommendation
    ].join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Consultation Brief & Action Plans"
        description="Generates an exportable executive brief, personal user checklists, and direct lawyer questions for legal consultations."
      />

      <form onSubmit={handleGenerate} className="editorial-panel rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Target Document ID for Consultation Preparation
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="flex-grow bg-[#0a1128] border border-[#1e293b] rounded-md p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              placeholder="e.g. doc-rental-sample"
            />
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 rounded-md bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Generating Brief...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 text-slate-950" />
                  Generate Action Plans
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-[#3f1616] border border-[#7f1d1d] text-red-200 text-xs space-y-3">
          <div>{error}</div>
          <button
            onClick={(e) => handleGenerate(e)}
            className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 border border-red-700 text-xs text-red-100 font-semibold transition-colors"
          >
            Retry Action Plan Generation
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Exportable Document Brief Card */}
          <div className="editorial-panel rounded-lg p-5 space-y-4 border-l-4 border-l-amber-500 relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-400 font-serif font-semibold text-sm">
                <FileText className="w-4 h-4 text-amber-400" />
                Document Consultation Brief
              </div>

              {/* Single Export Brief Button & Copy Action */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBrief}
                  className="px-3 py-1.5 rounded bg-[#0a1128] hover:bg-slate-800 border border-[#1e293b] text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  {copiedBrief ? 'Copied Brief' : 'Copy Brief'}
                </button>

                <button
                  onClick={handleExportBrief}
                  className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-950" />
                  Export Brief (Printable)
                </button>
              </div>
            </div>

            <div className="bg-[#0a1128] p-4 rounded border border-[#1e293b] space-y-2">
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Executive Consultation Bullets ({data.documentBrief?.length || 0})
              </h4>
              <ul className="space-y-2 text-sm text-slate-200 font-sans">
                {data.documentBrief?.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded bg-[#2d1b06] border border-[#78350f] text-xs text-amber-200/90 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Consultation Strategy: </span>
                {data.executiveRecommendation}
              </div>
            </div>
          </div>

          {/* Per-Clause Action Plans */}
          <div className="space-y-4">
            <h3 className="text-sm font-serif font-semibold text-slate-200 px-1 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              Clause-by-Clause Checklists & Lawyer Consultation Questions ({data.clauseActionPlans?.length || 0})
            </h3>

            <div className="space-y-4">
              {data.clauseActionPlans?.map((plan, idx) => (
                <div key={idx} className="editorial-card rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0a1128] text-amber-400 font-semibold border border-[#1e293b]">
                        {plan.clauseId}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{plan.category}</span>
                    </div>
                    <RiskBadge level={plan.riskLevel} />
                  </div>

                  <p className="text-xs text-slate-300 font-serif italic bg-[#0a1128] p-3 rounded border border-[#1e293b] leading-relaxed">
                    "{plan.verbatimSnippet}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Personal Action Checklist */}
                    <div className="space-y-2 bg-[#0a1128] p-3.5 rounded border border-[#1e293b]">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                        Personal Action Checklist ({plan.actionChecklist?.length || 0})
                      </span>
                      <div className="space-y-2 pt-1">
                        {plan.actionChecklist?.map((item, aIdx) => {
                          const itemKey = `${plan.clauseId}-act-${aIdx}`;
                          const isDone = !!completedActions[itemKey];
                          return (
                            <label
                              key={aIdx}
                              onClick={() => toggleAction(itemKey)}
                              className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer hover:text-white transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => {}}
                                className="mt-0.5 rounded border-[#1e293b] bg-[#0a1128] text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <span className={isDone ? 'line-through text-slate-500' : ''}>
                                {item}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Questions for Your Lawyer */}
                    <div className="space-y-2 bg-[#0a1128] p-3.5 rounded border border-[#1e293b]">
                      <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        Questions for Your Lawyer ({plan.lawyerQuestions?.length || 0})
                      </span>
                      <div className="space-y-2 pt-1">
                        {plan.lawyerQuestions?.map((qItem, qIdx) => (
                          <div
                            key={qIdx}
                            className="flex items-start gap-2 text-xs text-slate-200 bg-[#162032] p-2.5 rounded border border-[#233047]"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span className="font-serif leading-relaxed">"{qItem}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
