import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { askQuestion } from '../api/ask';
import { fetchClauses, extractClausesForDoc } from '../api/clauses';
import { ChatMessage, Citation, ClausesResponse } from '../types/clause';
import { ClauseCard } from '../components/ClauseCard';
import { Send, Loader2, BookOpen, User, Bot, AlertCircle, HelpCircle, ShieldAlert, FileText } from 'lucide-react';

export const AskPage: React.FC = () => {
  const [docId, setDocId] = useState('doc-rental-sample');
  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Document Clauses State for Docked View
  const [docData, setDocData] = useState<ClausesResponse | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const samplePrompts = [
    { label: "Termination Notice", query: "What is the notice period required for termination in this contract?" },
    { label: "Penalty Law", query: "What does Indian contract law specify regarding unreasonable penalty clauses?" },
    { label: "Out of Scope", query: "What is the employee parental leave allowance policy for this organization?" },
  ];

  // Load document clauses on mount or docId change
  const loadDocumentClauses = async (idToFetch: string) => {
    setLoadingDoc(true);
    setDocError(null);
    try {
      const res = await fetchClauses({ docId: idToFetch });
      setDocData(res);
    } catch (err: any) {
      // Fallback to extract if not existing
      try {
        const extRes = await extractClausesForDoc(idToFetch);
        setDocData(extRes);
      } catch (extErr: any) {
        setDocError('Could not load clauses for this document ID. You can still ask questions below.');
        setDocData(null);
      }
    } finally {
      setLoadingDoc(false);
    }
  };

  useEffect(() => {
    loadDocumentClauses(docId);
  }, [docId]);

  const handleSend = async (qText?: string) => {
    const textToSend = qText || inputQuestion;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!qText) setInputQuestion('');
    setLoading(true);
    setError(null);

    try {
      const historyForApi = updatedHistory.slice(-5);
      const res = await askQuestion({
        question: textToSend,
        docId,
        chatHistory: historyForApi,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        confidence: res.confidence,
        disclaimerFraming: res.disclaimerFraming,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate answer');
    } finally {
      setLoading(false);
    }
  };

  const handleScrollToClause = (clauseId: string) => {
    // Strip brackets or whitespace if present
    const cleanId = clauseId.replace(/[\[\]]/g, '').trim();
    const targetEl = document.getElementById(`clause-${cleanId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('clause-highlight');
      setTimeout(() => {
        targetEl.classList.remove('clause-highlight');
      }, 2500);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Docked Legal Q&A & Document Inspector"
        description="Ask questions docked alongside document clauses. Click clause tags in answers to jump to exact contract terms."
      />

      {/* Target Document Selector & Quick Test Queries */}
      <div className="editorial-panel rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-grow max-w-md">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Target Doc ID:
          </label>
          <input
            type="text"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className="bg-[#0a1128] border border-[#1e293b] rounded-md px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 w-full"
            placeholder="e.g. doc-rental-sample"
          />
          <button
            onClick={() => loadDocumentClauses(docId)}
            disabled={loadingDoc}
            className="px-3 py-1.5 rounded-md bg-[#0a1128] hover:bg-slate-800 text-amber-400 border border-[#1e293b] text-xs font-semibold shrink-0 transition-colors"
          >
            Load
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Test Prompts:</span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputQuestion(p.query);
                handleSend(p.query);
              }}
              className="px-2.5 py-1 rounded-md bg-[#0a1128] hover:bg-slate-800 border border-[#1e293b] text-[11px] text-amber-300 font-medium transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Docked Layout: Clause Dashboard (Left) | Ask Chat Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Document Clause Dashboard (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-serif font-semibold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Document Clauses ({docData?.clauses.length || 0})
            </h3>
            <span className="text-xs text-slate-400 font-mono">Doc: {docId}</span>
          </div>

          {loadingDoc && (
            <div className="editorial-panel rounded-lg p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading clauses for document {docId}...</span>
            </div>
          )}

          {docError && (
            <div className="p-3 rounded-lg bg-[#3f1616] border border-[#7f1d1d] text-red-200 text-xs">
              {docError}
            </div>
          )}

          {docData && (
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
              {docData.clauses.map((clause) => (
                <ClauseCard key={clause.id} clause={clause} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Docked Ask Chat Assistant (5 cols) */}
        <div className="lg:col-span-5 editorial-panel rounded-lg p-4 space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-serif font-semibold text-sm">
              <Bot className="w-4 h-4" />
              Legal Assistant Q&A
            </div>
            <span className="text-[11px] text-slate-400">Grounded in Indian Law</span>
          </div>

          {/* Chat Messages */}
          <div className="space-y-3 min-h-[300px] max-h-[480px] overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="text-center py-10 text-slate-500 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">
                  Ask any question about this document. Grounded clause numbers are clickable to inspect target text directly.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`p-1.5 rounded-md shrink-0 text-xs ${
                    msg.role === 'user'
                      ? 'bg-amber-600 text-slate-950 font-bold'
                      : 'bg-[#0a1128] text-amber-400 border border-[#1e293b]'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[88%] rounded-lg p-3 space-y-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-[#2d1b06] border border-[#78350f] text-slate-100'
                      : 'editorial-card text-slate-200'
                  }`}
                >
                  <p className="leading-relaxed font-sans">{msg.content}</p>

                  {/* Clickable Clause Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-[#1e293b] space-y-1.5">
                      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-amber-400" />
                        Grounded References ({msg.citations.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite: Citation, cIdx: number) => (
                          <button
                            key={cIdx}
                            onClick={() => handleScrollToClause(cite.clauseId)}
                            className="px-2 py-0.5 rounded bg-[#0a1128] hover:bg-slate-800 border border-[#1e293b] text-amber-300 font-mono text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title={`Click to scroll to ${cite.clauseId}`}
                          >
                            <span>{cite.clauseId}</span>
                            <span className="text-[9px] text-slate-400 uppercase">({cite.category})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.disclaimerFraming && (
                    <div className="pt-1.5 flex items-start gap-1 text-[10px] text-slate-400 italic border-t border-[#1e293b]/60">
                      <ShieldAlert className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                      <span>{msg.disclaimerFraming}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-3 editorial-card rounded-md">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Searching clauses & Indian statutes...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-md bg-[#3f1616] border border-[#7f1d1d] text-red-200 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => handleSend()}
                className="px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 border border-red-700 text-[11px] text-red-100 font-semibold transition-colors"
              >
                Retry Query
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative pt-1"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask a question about this contract..."
              className="w-full bg-[#0a1128] border border-[#1e293b] rounded-md py-2.5 pl-3 pr-10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="absolute right-1.5 top-2.5 p-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
