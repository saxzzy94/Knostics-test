import { parseString } from '@fast-csv/parse';
export type CsvKind = 'strings' | 'classifications' | 'unknown';
export type StringsRowNormalized = {
  Tier: string;
  Industry: string;
  Topic: string;
  Subtopic: string;
  Prefix: string;
  'Fuzzing-Idx': string;
  Prompt: string;
  Risks: string;
  Keywords: string;
};
export type ClassificationRowNormalized = {
  Topic: string;
  Subtopic: string;
  Industry: string;
  Classification: string;
};
const STRINGS_HEADERS: readonly string[] = [
  'Tier',
  'Industry',
  'Topic',
  'Subtopic',
  'Prefix',
  'Fuzzing-Idx',
  'Prompt',
  'Risks',
  'Keywords',
] as const;
const CLASSIFICATION_HEADERS: readonly string[] = [
  'Topic',
  'Subtopic',
  'Industry',
  'Classification',
] as const;
export function canonicalHeadersFor(kind: Exclude<CsvKind, 'unknown'>): string[] {
  return kind === 'strings' ? [...STRINGS_HEADERS] : [...CLASSIFICATION_HEADERS];
}
function normalizeHeaderToken(h: string): string {
  return h.replace(/\uFEFF/g, '') // strip BOM
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}
const HEADER_ALIASES: Record<string, string> = {
  // canonical => normal forms are resolved by reverse lookup
  // We'll map normalized tokens to canonical labels
  tier: 'Tier',
  industry: 'Industry',
  industries: 'Industry',
  topic: 'Topic',
  topics: 'Topic',
  subtopic: 'Subtopic', // handles subTopic, sub_topic, sub-topic, etc
  subtopics: 'Subtopic',
  prefix: 'Prefix',
  prefixes: 'Prefix',
  fuzzingidx: 'Fuzzing-Idx', // handles fuzzing-idx, fuzzing_idx, fuzzing idx
  fuzzidx: 'Fuzzing-Idx',
  fuzzindex: 'Fuzzing-Idx',
  fuzzingindex: 'Fuzzing-Idx',
  prompt: 'Prompt',
  risks: 'Risks',
  risk: 'Risks',
  keywords: 'Keywords',
  keyword: 'Keywords',
  classification: 'Classification',
  classifications: 'Classification',
};
function toCanonicalHeader(raw: string): string | undefined {
  const norm = normalizeHeaderToken(raw);
  return HEADER_ALIASES[norm];
}
function stripSepDirective(csvText: string): string {
  const lines = csvText.split(/\r?\n/);
  if (lines.length > 0 && /^sep\s*=\s*[^\s]+/i.test((lines[0] || '').trim())) {
    lines.shift();
  }
  return lines.join('\n');
}
function detectDelimiter(csvText: string): string {
  const firstNonEmpty = (csvText.split(/\r?\n/).find((l) => l.trim().length > 0) || '').trim();
  const candidates = [',', ';', '\t', '|'];
  const counts = candidates.map((d) => ({ d, c: (firstNonEmpty.match(new RegExp(d === '\\t' ? '\\t' : `\\${d}`, 'g')) || []).length }));
  counts.sort((a, b) => b.c - a.c);
  return counts[0].c > 0 ? (counts[0].d === '\t' ? '\t' : counts[0].d) : ',';
}
function decodeTextFromBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    // UTF-16 LE BOM
    return buf.toString('utf16le');
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    // UTF-8 BOM, Node will drop BOM in string anyway
    return buf.toString('utf8');
  }
  // Fallback
  return buf.toString('utf8');
}
export async function parseCsvBuffer(buf: Buffer): Promise<{ headers: string[]; rows: string[][] }> {
  const raw = decodeTextFromBuffer(buf);
  const csvString = stripSepDirective(raw);
  const delimiter = detectDelimiter(csvString);
  return new Promise((resolve, reject) => {
    const rows: string[][] = [];
    parseString(csvString, { headers: false, ignoreEmpty: true, trim: true, delimiter })
      .on('error', (error: unknown) => reject(error))
      .on('data', (row: any[]) => rows.push(row.map((v) => (v ?? '').toString())))
      .on('end', () => {
        if (rows.length === 0) return resolve({ headers: [], rows: [] });
        const headers = rows[0].map((h) => (h ?? '').toString());
        const dataRows = rows.slice(1).map((r) => r.map((v) => (v ?? '').toString()));
        resolve({ headers, rows: dataRows });
      });
  });
}
export function detectCsvKind(rawHeaders: string[]): CsvKind {
  const canonicalSet = new Set(rawHeaders.map((h) => toCanonicalHeader(h)).filter(Boolean) as string[]);
  const hasAll = (...keys: string[]) => keys.every((k) => canonicalSet.has(k));
  const hasAny = (...keys: string[]) => keys.some((k) => canonicalSet.has(k));
  // Check for classifications first (more specific due to 'Classification' column)
  if (hasAll('Topic', 'Subtopic', 'Industry', 'Classification')) return 'classifications';
  // Strings: must have Topic/Subtopic/Industry and at least one additional strings column
  if (hasAll('Topic', 'Subtopic', 'Industry') && hasAny('Tier', 'Prefix', 'Fuzzing-Idx', 'Prompt', 'Risks', 'Keywords')) {
    return 'strings';
  }
  return 'unknown';
}
export function toCanonicalRows(
  kind: Exclude<CsvKind, 'unknown'>,
  rawHeaders: string[],
  rawRows: string[][],
): string[][] {
  const headerIndex: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    const canon = toCanonicalHeader(h);
    if (canon && !(canon in headerIndex)) headerIndex[canon] = i;
  });
  const canonHeaders = canonicalHeadersFor(kind);
  const rows = rawRows.map((row) =>
    canonHeaders.map((h) => {
      const idx = headerIndex[h];
      const val = idx !== undefined && row[idx] != null ? String(row[idx]) : '';
      return val.trim();
    }),
  );
  return rows;
}
export function fromCanonicalRows(
  kind: 'strings',
  rows: string[][],
): StringsRowNormalized[];
export function fromCanonicalRows(
  kind: 'classifications',
  rows: string[][],
): ClassificationRowNormalized[];
export function fromCanonicalRows(kind: Exclude<CsvKind, 'unknown'>, rows: string[][]): any[] {
  if (kind === 'strings') {
    return rows.map((r) => ({
      Tier: r[0] ?? '',
      Industry: r[1] ?? '',
      Topic: r[2] ?? '',
      Subtopic: r[3] ?? '',
      Prefix: r[4] ?? '',
      'Fuzzing-Idx': r[5] ?? '',
      Prompt: r[6] ?? '',
      Risks: r[7] ?? '',
      Keywords: r[8] ?? '',
    }));
  }
  // classifications
  return rows.map((r) => ({
    Topic: r[0] ?? '',
    Subtopic: r[1] ?? '',
    Industry: r[2] ?? '',
    Classification: r[3] ?? '',
  }));
}
function escapeCsvField(value: string): string {
  const s = (value ?? '').toString();
  const needsQuote = /[",\n\r]/.test(s) || /^\s|\s$/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}
export function rowsToCsv(
  kind: Exclude<CsvKind, 'unknown'>,
  headers: string[],
  rows: string[][],
): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvField).join(','));
  for (const row of rows) {
    const line = row.map((v) => escapeCsvField(String(v ?? ''))).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}
