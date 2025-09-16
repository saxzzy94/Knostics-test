import { ClassificationRowNormalized, StringsRowNormalized } from './csvUtils';
export type ValidationError = {
  rowIndex: number;
  message: string;
  fields: {
    Topic: string;
    Subtopic: string;
    Industry: string;
  };
};
export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  invalidIndices: number[];
};
function keyOf(topic: string, subtopic: string, industry: string): string {
  const norm = (s: string) => (s ?? '').toString().trim().toLowerCase();
  return `${norm(topic)}||${norm(subtopic)}||${norm(industry)}`;
}
export function validateStrings(
  strings: StringsRowNormalized[],
  classifications: ClassificationRowNormalized[],
): ValidationResult {
  const allowed = new Set<string>();
  for (const c of classifications) {
    allowed.add(keyOf(c.Topic, c.Subtopic, c.Industry));
  }
  const errors: ValidationError[] = [];
  strings.forEach((row, idx) => {
    const k = keyOf(row.Topic, row.Subtopic, row.Industry);
    if (!allowed.has(k)) {
      errors.push({
        rowIndex: idx,
        message:
          'Invalid combination: Topic + Subtopic + Industry does not exist in classifications.csv',
        fields: { Topic: row.Topic, Subtopic: row.Subtopic, Industry: row.Industry },
      });
    }
  });
  return {
    valid: errors.length === 0,
    errors,
    invalidIndices: errors.map((e) => e.rowIndex),
  };
}
