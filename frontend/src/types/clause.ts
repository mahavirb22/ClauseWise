export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ClauseCategory =
  | 'payment'
  | 'termination'
  | 'liability'
  | 'indemnity'
  | 'auto_renewal'
  | 'arbitration'
  | 'confidentiality'
  | 'other';

export interface Clause {
  id: string;
  text: string;
  category: ClauseCategory | string;
  plainLanguage: string;
  riskLevel: RiskLevel;
  riskReason: string;
  conflictsWith: string[];
}

export interface DocumentSummary {
  docId: string;
  fileName: string;
  plainSummary: string;
  clauses: Clause[];
  rawText?: string;
}

// Request & Response DTO Interfaces
export interface IngestResponse {
  document: DocumentSummary;
  message: string;
  status: string;
}

export interface ClausesFilterParams {
  docId?: string;
  riskLevel?: RiskLevel;
  category?: string;
}

export interface ClausesResponse {
  docId: string;
  total: number;
  clauses: Clause[];
  isLegalDocument?: boolean;
  nonLegalWarning?: string;
}

export interface CompareRequest {
  docIdA: string;
  docIdB: string;
  focusCategories?: string[];
}

export type FavorsType = 'docA' | 'docB' | 'neutral';

export interface ClauseComparisonPair {
  topic: string;
  docAText: string;
  docBText: string;
  differenceSummary: string;
  favors: FavorsType | string;
  riskDelta: string;
}

export interface MissingClauseItem {
  presentIn: 'docA' | 'docB' | string;
  clauseId: string;
  topic: string;
  text: string;
  impact: string;
}

export interface CompareResponse {
  docIdA: string;
  docIdB: string;
  similarityScore: number;
  summary: string;
  overallRecommendation: string;
  pairedComparisons: ClauseComparisonPair[];
  unilateralClauses: MissingClauseItem[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  confidence?: number;
  disclaimerFraming?: string;
}

export interface AskRequest {
  question: string;
  docId?: string;
  chatHistory?: ChatMessage[];
}

export interface Citation {
  clauseId: string;
  category: string;
  snippet: string;
  relevanceScore: number;
}

export interface AskResponse {
  question: string;
  answer: string;
  citations: Citation[];
  confidence: number;
  disclaimerFraming: string;
}

export interface NextStepsRequest {
  docId: string;
}

export interface ClauseActionPlan {
  clauseId: string;
  category: string;
  riskLevel: RiskLevel;
  verbatimSnippet: string;
  actionChecklist: string[];
  lawyerQuestions: string[];
}

export interface ActionItem {
  id: string;
  priority: RiskLevel;
  title: string;
  recommendation: string;
  clauseId?: string;
}

export interface NextStepsResponse {
  docId: string;
  fileName: string;
  documentBrief: string[];
  executiveRecommendation: string;
  clauseActionPlans: ClauseActionPlan[];
  actionItems: ActionItem[];
}
