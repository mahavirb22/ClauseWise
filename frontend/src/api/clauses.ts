import { fetchJson } from './client';
import { Clause, ClausesFilterParams, ClausesResponse } from '../types/clause';

export async function fetchClauses(params: ClausesFilterParams = {}): Promise<ClausesResponse> {
  const query = new URLSearchParams();
  if (params.docId) query.set('docId', params.docId);
  if (params.riskLevel) query.set('riskLevel', params.riskLevel);
  if (params.category) query.set('category', params.category);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return fetchJson<ClausesResponse>(`/api/clauses${queryString}`);
}

export async function extractClausesForDoc(docId: string): Promise<ClausesResponse> {
  return fetchJson<ClausesResponse>(`/api/clauses/${docId}`, {
    method: 'POST',
  });
}

export async function fetchClauseById(clauseId: string): Promise<Clause> {
  return fetchJson<Clause>(`/api/clauses/${clauseId}`);
}
