import { fetchJson } from './client';
import { AskRequest, AskResponse } from '../types/clause';

export async function askQuestion(req: AskRequest): Promise<AskResponse> {
  return fetchJson<AskResponse>('/api/ask', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
