import { fetchJson } from './client';
import { NextStepsRequest, NextStepsResponse } from '../types/clause';

export async function fetchNextSteps(req: NextStepsRequest | string): Promise<NextStepsResponse> {
  const docId = typeof req === 'string' ? req : req.docId;
  return fetchJson<NextStepsResponse>(`/api/nextsteps/${docId}`, {
    method: 'POST',
  });
}
