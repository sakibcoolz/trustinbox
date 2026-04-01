import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeCsvField, buildCsvString, downloadCsv } from '@/lib/utils/csv-export';

describe('csv-export', () => {
  describe('sanitizeCsvField', () => {
    it('returns plain strings as-is', () => {
      expect(sanitizeCsvField('hello')).toBe('hello');
    });

    it('prefixes = to prevent formula injection', () => {
      expect(sanitizeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    });

    it('prefixes + to prevent formula injection', () => {
      expect(sanitizeCsvField('+cmd|...')).toBe("'+cmd|...");
    });

    it('prefixes - to prevent formula injection', () => {
      expect(sanitizeCsvField('-5')).toBe("'-5");
    });

    it('prefixes @ to prevent formula injection', () => {
      expect(sanitizeCsvField('@user')).toBe("'@user");
    });

    it('wraps fields with commas in quotes', () => {
      expect(sanitizeCsvField('one,two')).toBe('"one,two"');
    });

    it('escapes internal quotes', () => {
      expect(sanitizeCsvField('say "hello"')).toBe('"say ""hello"""');
    });

    it('wraps fields with newlines in quotes', () => {
      expect(sanitizeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('handles non-string values', () => {
      expect(sanitizeCsvField(null as unknown as string)).toBe('');
      expect(sanitizeCsvField(42 as unknown as string)).toBe('42');
    });
  });

  describe('buildCsvString', () => {
    it('builds header + data rows', () => {
      const result = buildCsvString(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']]);
      expect(result).toBe('Name,Age\nAlice,30\nBob,25');
    });

    it('sanitizes fields in output', () => {
      const result = buildCsvString(['Value'], [['=malicious']]);
      expect(result).toContain("'=malicious");
    });

    it('handles empty rows', () => {
      const result = buildCsvString(['A', 'B'], []);
      expect(result).toBe('A,B');
    });
  });

  describe('downloadCsv', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:test'),
        revokeObjectURL: vi.fn(),
      });
    });

    it('creates a link element and triggers download', () => {
      const clickSpy = vi.fn();
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        style: { display: '' },
        click: clickSpy,
      } as unknown as HTMLAnchorElement);

      downloadCsv('col1,col2\na,b', 'test.csv');

      expect(clickSpy).toHaveBeenCalledOnce();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
