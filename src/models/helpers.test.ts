import { describe, it, expect } from 'vitest';
import { boolIntIn, boolIntInOptional, boolIntOut } from './helpers';

describe('helpers', () => {
  describe('boolIntIn', () => {
    it('converts true to 1', () => {
      expect(boolIntIn.parse(true)).toBe(1);
    });

    it('converts false to 0', () => {
      expect(boolIntIn.parse(false)).toBe(0);
    });

    it('converts string "true" to 1', () => {
      expect(boolIntIn.parse('true')).toBe(1);
    });

    it('converts string "false" to 0', () => {
      expect(boolIntIn.parse('false')).toBe(0);
    });

    it('passes numbers through', () => {
      expect(boolIntIn.parse(1)).toBe(1);
      expect(boolIntIn.parse(0)).toBe(0);
    });
  });

  describe('boolIntInOptional', () => {
    it('returns undefined when value is undefined', () => {
      expect(boolIntInOptional.parse(undefined)).toBeUndefined();
    });

    it('converts true to 1', () => {
      expect(boolIntInOptional.parse(true)).toBe(1);
    });

    it('converts false to 0', () => {
      expect(boolIntInOptional.parse(false)).toBe(0);
    });
  });

  describe('boolIntOut', () => {
    it('converts 1 to true', () => {
      expect(boolIntOut.parse(1)).toBe(true);
    });

    it('converts 0 to false', () => {
      expect(boolIntOut.parse(0)).toBe(false);
    });

    it('passes boolean true through', () => {
      expect(boolIntOut.parse(true)).toBe(true);
    });

    it('passes boolean false through', () => {
      expect(boolIntOut.parse(false)).toBe(false);
    });
  });
});
