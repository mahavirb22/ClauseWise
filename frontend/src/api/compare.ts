import { fetchJson } from './client';
import { CompareRequest, CompareResponse } from '../types/clause';

export async function compareDocuments(req: CompareRequest): Promise<CompareResponse> {
  return fetchJson<CompareResponse>('/api/compare', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
