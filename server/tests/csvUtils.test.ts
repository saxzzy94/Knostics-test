import { describe, it, expect, vi } from 'vitest';
import { 
  parseCsvBuffer, 
  detectCsvKind, 
  toCanonicalRows, 
  canonicalHeadersFor, 
  fromCanonicalRows, 
  rowsToCsv,
  CsvKind
} from '../src/utils/csvUtils';

describe('CSV Utils', () => {
  const stringsCsv = `Tier,Industry,Topic,SubTopic,Prefix,Fuzzing-Idx,Prompt,Risks,Keywords\n1,X,A,A1,pre,0,foo,low,bar`;
  const classCsv = `Topic,Subtopic,Industry,Classification\nA,A1,X,allow`;
  const malformedCsv = `Tier,Industry\n1,X,ExtraField`;
  const bomCsv = '\uFEFF' + stringsCsv;
  const sepDirectiveCsv = 'sep=;\n' + stringsCsv.replace(/,/g, ';');

  describe('parseCsvBuffer', () => {
    it('parses valid CSV with BOM', async () => {
      const { headers, rows } = await parseCsvBuffer(Buffer.from(bomCsv, 'utf8'));
      expect(headers[0]).toBe('Tier');
      expect(rows).toHaveLength(1);
    });

    it('handles different delimiters with sep directive', async () => {
      const { headers } = await parseCsvBuffer(Buffer.from(sepDirectiveCsv, 'utf8'));
      expect(headers[0]).toBe('Tier');
    });
  });

  describe('detectCsvKind', () => {
    it('detects strings CSV by headers', async () => {
      const { headers } = await parseCsvBuffer(Buffer.from(stringsCsv, 'utf8'));
      expect(detectCsvKind(headers)).toBe('strings');
    });

    it('detects classifications CSV by headers', async () => {
      const { headers } = await parseCsvBuffer(Buffer.from(classCsv, 'utf8'));
      expect(detectCsvKind(headers)).toBe('classifications');
    });

    it('returns unknown for invalid headers', () => {
      expect(detectCsvKind(['Invalid', 'Headers'])).toBe('unknown');
    });
  });

  describe('toCanonicalRows', () => {
    it('converts strings CSV to canonical format', async () => {
      const { headers, rows } = await parseCsvBuffer(Buffer.from(stringsCsv, 'utf8'));
      const canonical = toCanonicalRows('strings', headers, rows);
      expect(canonical[0]).toHaveLength(9); // Number of expected fields
    });

    it('handles missing fields by filling with empty strings', async () => {
      const { headers, rows } = await parseCsvBuffer(Buffer.from(malformedCsv, 'utf8'));
      const result = toCanonicalRows('strings' as const, headers, rows);
      // Should still process the row but with empty strings for missing fields
      expect(result[0]).toHaveLength(9); // All 9 fields should be present
      expect(result[0][0]).toBe('1'); // First field should be present
      expect(result[0][1]).toBe('X'); // Second field should be present
      // Remaining fields should be empty strings
      expect(result[0].slice(2).every(field => field === '')).toBe(true);
    });
  });

  describe('fromCanonicalRows', () => {
    it('converts canonical rows to strings format', () => {
      const canonical = [['1', 'X', 'A', 'A1', 'pre', '0', 'foo', 'low', 'bar']];
      const result = fromCanonicalRows('strings', canonical);
      expect(result[0]).toMatchObject({
        Tier: '1',
        Industry: 'X',
        Topic: 'A',
        Subtopic: 'A1',
        Prefix: 'pre',
        'Fuzzing-Idx': '0',
        Prompt: 'foo',
        Risks: 'low',
        Keywords: 'bar'
      });
    });
  });

  describe('rowsToCsv', () => {
    it('converts rows back to CSV format', () => {
      const headers = ['Tier', 'Industry'];
      const rows = [['1', 'X']];
      const csv = rowsToCsv('strings', headers, rows);
      expect(csv).toContain('Tier,Industry');
      expect(csv).toContain('1,X');
    });
  });

  describe('parseCsvBuffer with different encodings', () => {
    it('handles UTF-8 encoded content', async () => {
      const content = 'Tier,Industry\n1,X';
      const { headers, rows } = await parseCsvBuffer(Buffer.from(content, 'utf8'));
      expect(headers).toEqual(['Tier', 'Industry']);
      expect(rows[0]).toEqual(['1', 'X']);
    });
  });

  describe('rowsToCsv with special characters', () => {
    it('handles CSV with quotes and commas', () => {
      const headers = ['Name', 'Description'];
      const rows = [['Test', 'Contains, comma']];
      // Using type assertion since we know this is a valid CsvKind for this test
      const csv = rowsToCsv('strings' as const, headers, rows);
      expect(csv).toContain('Name,Description');
      expect(csv).toContain('Test,"Contains, comma"');
    });
  });
});
