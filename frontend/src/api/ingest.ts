import { fetchJson } from './client';
import { IngestResponse } from '../types/clause';

export async function ingestDocument(file?: File, rawText?: string): Promise<IngestResponse> {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (rawText) {
    formData.append('raw_text', rawText);
  }

  return fetchJson<IngestResponse>('/api/ingest', {
    method: 'POST',
    body: formData,
  });
}
