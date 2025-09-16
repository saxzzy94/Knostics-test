export type CsvKind = 'strings' | 'classifications';
export type TableData = {
  headers: string[];
  rows: string[][];
};
export type DataResponse = {
  strings: TableData;
  classifications: TableData;
};
export type UploadResponse = {
  type: CsvKind;
  headers: string[];
  rows: string[][];
};
export type ValidationError = {
  rowIndex: number;
  message: string;
  fields: { Topic: string; Subtopic: string; Industry: string };
};
export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  invalidIndices: number[];
};
async function handle(res: Response) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
      const err: any = new Error(msg);
      err.details = body;
      throw err;
    } catch (_) {
    }
    throw new Error(msg);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}
export const api = {
  async getData(): Promise<DataResponse> {
    const res = await fetch('/api/data');
    return handle(res);
  },
  async uploadFile(file: File): Promise<UploadResponse> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    return handle(res);
  },
  async validate(rows?: string[][]): Promise<ValidationResult> {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    return handle(res);
  },
  async save(type: CsvKind, rows: string[][]): Promise<{ ok: boolean }> {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, rows }),
    });
    if (res.ok) return res.json();
    try {
      const data = await res.json();
      if (typeof data?.valid === 'boolean' && Array.isArray(data?.errors)) {
        const err: any = new Error('Validation failed');
        err.validation = data as ValidationResult;
        throw err;
      }
      const msg = data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    } catch (_) {
      throw new Error(`HTTP ${res.status}`);
    }
  },
  async exportCsv(type: CsvKind): Promise<void> {
    const res = await fetch(`/api/export/${type}`);
    if (!res.ok) throw new Error(`Failed to export ${type}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
