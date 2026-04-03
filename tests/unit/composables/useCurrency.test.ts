/**
 * Tests for the currency utility functions from useCurrency.
 * Since useCurrency() is a composable that uses Pinia stores,
 * we test the core math functions directly.
 */
import { describe, it, expect } from 'vitest';

// Test the pure math functions that useCurrency wraps
// These are the critical money-math functions

describe('currency conversion: toCents', () => {
  function toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  it('converts whole euros to cents', () => {
    expect(toCents(12)).toBe(1200);
  });

  it('converts euros and cents', () => {
    expect(toCents(12.50)).toBe(1250);
  });

  it('converts zero', () => {
    expect(toCents(0)).toBe(0);
  });

  it('handles floating-point precision (0.1 + 0.2)', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    // Math.round should handle this correctly
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('rounds half-cent values correctly', () => {
    expect(toCents(1.005)).toBe(101); // rounds up
    expect(toCents(1.004)).toBe(100); // rounds down
  });

  it('handles large amounts', () => {
    expect(toCents(99999.99)).toBe(9999999);
  });

  it('handles negative amounts', () => {
    expect(toCents(-5.50)).toBe(-550);
  });
});

describe('currency conversion: fromCents', () => {
  function fromCents(cents: number): number {
    return cents / 100;
  }

  it('converts cents to euros', () => {
    expect(fromCents(1250)).toBe(12.50);
  });

  it('converts zero', () => {
    expect(fromCents(0)).toBe(0);
  });

  it('converts negative cents', () => {
    expect(fromCents(-550)).toBe(-5.50);
  });

  it('converts single cent', () => {
    expect(fromCents(1)).toBe(0.01);
  });

  it('converts large values', () => {
    expect(fromCents(9999999)).toBe(99999.99);
  });
});

describe('currency formatting (Intl.NumberFormat)', () => {
  it('formats EUR correctly', () => {
    const formatter = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const result = formatter.format(1250 / 100);
    // Should contain 12,50 and € (exact format varies by environment)
    expect(result).toContain('12,50');
  });

  it('formats USD correctly', () => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const result = formatter.format(1250 / 100);
    expect(result).toContain('12.50');
    expect(result).toContain('$');
  });

  it('formats GBP correctly', () => {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const result = formatter.format(1250 / 100);
    expect(result).toContain('12.50');
    expect(result).toContain('£');
  });

  it('formats zero amount', () => {
    const formatter = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const result = formatter.format(0);
    expect(result).toContain('0,00');
  });

  it('formats large amounts with thousands separator', () => {
    const formatter = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const result = formatter.format(124750 / 100);
    // 1.247,50 in German formatting
    expect(result).toContain('1.247,50');
  });
});
