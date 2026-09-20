import React, { useState } from 'react';
import { Header } from '../components/Header';
import { ClauseCard } from '../components/ClauseCard';
import { ingestDocument } from '../api/ingest';
import { extractClausesForDoc } from '../api/clauses';
import { IngestResponse, Clause } from '../types/clause';
import { FileUp, Loader2, CheckCircle2, AlertCircle, FileText, Sparkles, X, RotateCcw, AlertTriangle } from 'lucide-react';

export const IngestPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [response, setResponse] = useState<IngestResponse | null>(null);
  const [extractedClauses, setExtractedClauses] = useState<Clause[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nonLegalWarning, setNonLegalWarning] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setRawText('');
    setResponse(null);
    setExtractedClauses([]);
    setError(null);
    setNonLegalWarning(null);
  };

  const handleIngest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile && !rawText.trim()) return;
    setLoading(true);
    setError(null);
    setNonLegalWarning(null);
    setExtractedClauses([]);
    try {
      const res = await ingestDocument(selectedFile || undefined, rawText || undefined);
      setResponse(res);
      if (res.document.docId) {
        handleExtractClauses(res.document.docId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document. Please check file format or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractClauses = async (docId: string) => {
    setExtracting(true);
    try {
      const clausesRes = await extractClausesForDoc(docId);
      if (clausesRes.isLegalDocument === false) {
        setNonLegalWarning(
          clausesRes.nonLegalWarning || "This document does not appear to be a legal contract or agreement. Please upload a valid contract."
        );
        setExtractedClauses([]);
      } else {
        setExtractedClauses(clausesRes.clauses);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract clauses');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Header
        title="Document Analysis & Ingestion"
        description="Upload a PDF, image, or text contract to analyze structured clauses, plain-language summaries, and risk factors."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Container */}
        <form onSubmit={handleIngest} className="editorial-panel rounded-lg p-6 space-y-5">
          <h2 className="text-lg font-serif font-semibold text-slate-100 border-b border-[#1e293b] pb-3">
            Upload Contract File
          </h2>

          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors bg-[#0a1128] ${
                isDragging
                  ? 'border-amber-500 bg-amber-950/20'
                  : selectedFile
                  ? 'border-slate-600'
                  : 'border-[#1e293b] hover:border-slate-600'
              }`}
            >
              <FileUp className="w-10 h-10 mx-auto text-amber-500 mb-3" />
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />

              {!selectedFile ? (
                <div>
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-sm font-semibold text-amber-400 hover:text-amber-300"
                  >
                    Click to select file
                  </label>
                  <span className="text-sm text-slate-400"> or drag and drop here</span>
                  <p className="text-xs text-slate-500 mt-2">Supports PDF, PNG, JPG, WEBP, TXT, MD (Max 15MB)</p>
                </div>
              ) : (
                /* File Preview Card */
                <div className="flex items-center justify-between p-3 rounded bg-[#162032] border border-[#233047] max-w-sm mx-auto">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="text-left truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#1e293b]"></div>
            <span className="flex-shrink mx-4 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              OR PASTE CONTRACT TEXT
            </span>
            <div className="flex-grow border-t border-[#1e293b]"></div>
          </div>

          <div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste contract text here..."
              className="w-full bg-[#0a1128] border border-[#1e293b] rounded p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading || extracting || (!selectedFile && !rawText.trim())}
            className="w-full py-3 px-4 rounded bg-amber-600 hover:bg-amber-500 font-semibold text-xs uppercase tracking-wider text-slate-950 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing document...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Analyze Document
              </>
            )}
          </button>
        </form>

        {/* Results Container */}
        <div className="space-y-5">
          {error && (
            <div className="p-4 rounded bg-[#3f1616] border border-[#7f1d1d] text-red-200 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => handleIngest()}
                className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 border border-red-700 text-xs text-red-100 flex items-center gap-1.5 transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Ingestion
              </button>
            </div>
          )}

          {nonLegalWarning && (
            <div className="editorial-panel rounded-lg p-6 space-y-4 border-l-4 border-l-amber-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-serif font-semibold text-amber-300">
                    Non-Legal Document Detected
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {nonLegalWarning}
                  </p>
                </div>
              </div>

              <button
                onClick={resetForm}
                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Upload Another Document
              </button>
            </div>
          )}

          {response && !nonLegalWarning && (
            <div className="space-y-5">
              {/* Document Summary Header */}
              <div className="editorial-panel rounded-lg p-6 space-y-3.5 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-serif font-bold text-slate-100 text-base">{response.document.fileName}</h2>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0a1128] text-amber-400 border border-[#1e293b]">
                    docId: {response.document.docId}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    Document Executive Summary
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans bg-[#0a1128] p-4 rounded border border-[#1e293b]">
                    {response.document.plainSummary || "Plain-language 3-4 sentence overview analyzing legal scope, core risks, notice periods, and liability exposure across the agreement."}
                  </p>
                </div>
              </div>

              {/* Progress State during clause extraction */}
              {extracting && (
                <div className="editorial-panel rounded-lg p-6 text-center text-slate-300 flex items-center justify-center gap-3 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Analyzing document...</span>
                </div>
              )}

              {/* Extracted Clause Cards */}
              {extractedClauses.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-serif font-semibold text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Extracted Document Clauses ({extractedClauses.length})
                  </h3>
                  <div className="space-y-3.5">
                    {extractedClauses.map((clause) => (
                      <ClauseCard key={clause.id} clause={clause} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!response && !loading && !error && !nonLegalWarning && (
            <div className="editorial-panel rounded-lg p-12 text-center text-slate-500 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-slate-700" />
              <p className="text-sm font-serif">Upload a PDF, image, or text contract to generate a plain-language summary and clause breakdown.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
