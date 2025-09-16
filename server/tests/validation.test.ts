import { describe, it, expect } from 'vitest';
import { validateStrings } from '../src/utils/validation';
import type { ClassificationRowNormalized, StringsRowNormalized } from '../src/utils/csvUtils';

describe('validateStrings', () => {
  // Helper function to create test data
  const createClassification = (
    Topic: string,
    Subtopic: string,
    Industry: string,
    Classification: string = 'allow'
  ): ClassificationRowNormalized => ({
    Topic,
    Subtopic,
    Industry,
    Classification
  });

  const createStringRow = (
    Tier: string,
    Industry: string,
    Topic: string,
    Subtopic: string,
    Prefix: string = '',
    FuzzingIdx: string = '0',
    Prompt: string = '',
    Risks: string = '',
    Keywords: string = ''
  ): StringsRowNormalized => ({
    Tier,
    Industry,
    Topic,
    Subtopic,
    'Fuzzing-Idx': FuzzingIdx,
    Prefix,
    Prompt,
    Risks,
    Keywords
  });

  it('returns valid when all combinations exist in classifications', () => {
    const classifications: ClassificationRowNormalized[] = [
      createClassification('A', 'A1', 'X'),
      createClassification('B', 'B1', 'Y')
    ];

    const strings: StringsRowNormalized[] = [
      createStringRow('1', 'X', 'A', 'A1'),
      createStringRow('2', 'Y', 'B', 'B1')
    ];

    const result = validateStrings(strings, classifications);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.invalidIndices).toHaveLength(0);
  });

  it('returns invalid when a combination is missing from classifications', () => {
    const classifications: ClassificationRowNormalized[] = [
      createClassification('A', 'A1', 'X')
    ];

    const strings: StringsRowNormalized[] = [
      createStringRow('1', 'X', 'A', 'A1'),
      createStringRow('2', 'Y', 'B', 'B1') // This one is not in classifications
    ];

    const result = validateStrings(strings, classifications);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.invalidIndices).toEqual([1]);
    expect(result.errors[0].fields).toEqual({
      Topic: 'B',
      Subtopic: 'B1',
      Industry: 'Y'
    });
  });

  it('is case insensitive when comparing values', () => {
    const classifications: ClassificationRowNormalized[] = [
      createClassification('a', 'a1', 'x') // lowercase
    ];

    const strings: StringsRowNormalized[] = [
      createStringRow('1', 'X', 'A', 'A1') // uppercase
    ];

    const result = validateStrings(strings, classifications);
    expect(result.valid).toBe(true);
  });

  it('trims whitespace when comparing values', () => {
    const classifications: ClassificationRowNormalized[] = [
      createClassification(' A ', ' A1 ', ' X ')
    ];

    const strings: StringsRowNormalized[] = [
      createStringRow('1', 'X', 'A', 'A1')
    ];

    const result = validateStrings(strings, classifications);
    expect(result.valid).toBe(true);
  });

  it('handles empty strings in classifications', () => {
    const classifications: ClassificationRowNormalized[] = [
      createClassification('', '', '')
    ];

    const strings: StringsRowNormalized[] = [
      createStringRow('1', '', '', '')
    ];

    const result = validateStrings(strings, classifications);
    expect(result.valid).toBe(true);
  });

  it('returns multiple errors for multiple invalid rows', () => {
    const classifications: ClassificationRowNormalized[] = [
      createClassification('A', 'A1', 'X')
    ];

    const strings: StringsRowNormalized[] = [
      createStringRow('1', 'Y', 'B', 'B1'), // invalid
      createStringRow('2', 'X', 'A', 'A1'), // valid
      createStringRow('3', 'Z', 'C', 'C1')  // invalid
    ];

    const result = validateStrings(strings, classifications);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.invalidIndices).toEqual([0, 2]);
  });
});