/**
 * Tests for month.service.ts — specifically the budget math in createDraftMonth.
 *
 * Since createDraftMonth relies on Firestore (setDoc), we mock the Firebase SDK
 * and verify the budget calculations are correct.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: '2026-04' })),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn(),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
    now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
  },
}));

vi.mock('@/config/firebase', () => ({
  db: {},
}));

import { createDraftMonth, getCurrentMonthId } from '@/services/month.service';
import { isOk } from '@/types/result';

describe('getCurrentMonthId', () => {
  it('returns YYYY-MM format', () => {
    const result = getCurrentMonthId();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it('pads single-digit months with zero', () => {
    const result = getCurrentMonthId();
    const month = result.split('-')[1];
    expect(month).toHaveLength(2);
  });
});

describe('createDraftMonth — budget math', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates spendingBudget = totalIncome - totalFixedCosts - totalGoalDeductions', async () => {
    const result = await createDraftMonth('budget1', '2026-04', {
      incomes: [
        { id: 'inc1', label: 'Salary', amount: 500000 },
        { id: 'inc2', label: 'Freelance', amount: 100000 },
      ],
      appliedFixedCosts: [
        { costId: 'c1', name: 'Rent', amount: 80000 },
        { costId: 'c2', name: 'Electric', amount: 15000 },
      ],
      appliedGoalDeductions: [
        { goalId: 'g1', name: 'Vacation', monthlyAmount: 20000, accumulatedTotal: 20000 },
      ],
      rolloverAmount: 0,
      rolloverEnabled: false,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const month = result.data;
    // totalIncome = 500000 + 100000 = 600000
    expect(month.totalIncome).toBe(600000);
    // totalFixedCosts = 80000 + 15000 = 95000
    expect(month.totalFixedCosts).toBe(95000);
    // totalGoalDeductions = 20000
    expect(month.totalGoalDeductions).toBe(20000);
    // spendingBudget = 600000 - 95000 - 20000 = 485000
    expect(month.spendingBudget).toBe(485000);
  });

  it('starts with zero totalPurchases', async () => {
    const result = await createDraftMonth('budget1', '2026-04', {
      incomes: [{ id: 'inc1', label: 'Salary', amount: 300000 }],
      appliedFixedCosts: [],
      appliedGoalDeductions: [],
      rolloverAmount: 0,
      rolloverEnabled: false,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.data.totalPurchases).toBe(0);
  });

  it('sets rolloverAmount to 0 when rollover is disabled', async () => {
    const result = await createDraftMonth('budget1', '2026-04', {
      incomes: [{ id: 'inc1', label: 'Salary', amount: 300000 }],
      appliedFixedCosts: [],
      appliedGoalDeductions: [],
      rolloverAmount: 50000,
      rolloverEnabled: false,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.data.rolloverAmount).toBe(0);
  });

  it('preserves rolloverAmount when rollover is enabled', async () => {
    const result = await createDraftMonth('budget1', '2026-04', {
      incomes: [{ id: 'inc1', label: 'Salary', amount: 300000 }],
      appliedFixedCosts: [],
      appliedGoalDeductions: [],
      rolloverAmount: 50000,
      rolloverEnabled: true,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.data.rolloverAmount).toBe(50000);
  });

  it('creates month in draft status', async () => {
    const result = await createDraftMonth('budget1', '2026-04', {
      incomes: [{ id: 'inc1', label: 'Salary', amount: 300000 }],
      appliedFixedCosts: [],
      appliedGoalDeductions: [],
      rolloverAmount: 0,
      rolloverEnabled: false,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.data.status).toBe('draft');
  });

  it('parses year and month from monthId correctly', async () => {
    const result = await createDraftMonth('budget1', '2026-12', {
      incomes: [],
      appliedFixedCosts: [],
      appliedGoalDeductions: [],
      rolloverAmount: 0,
      rolloverEnabled: false,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.data.year).toBe(2026);
    expect(result.data.month).toBe(12);
  });

  it('initializes alerts as unsent', async () => {
    const result = await createDraftMonth('budget1', '2026-04', {
      incomes: [],
      appliedFixedCosts: [],
      appliedGoalDeductions: [],
      rolloverAmount: 0,
      rolloverEnabled: false,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.data.alerts).toEqual({
      eightyPercentSent: false,
      overspentSent: false,
    });
  });

  it('handles empty incomes (zero budget)', async () => {
    const result = await createDraftMonth('budget1', '2026-04', {
      incomes: [],
      appliedFixedCosts: [{ costId: 'c1', name: 'Rent', amount: 80000 }],
      appliedGoalDeductions: [],
      rolloverAmount: 0,
      rolloverEnabled: false,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    // 0 - 80000 - 0 = -80000 (negative spending budget is valid — it means overspent before starting)
    expect(result.data.spendingBudget).toBe(-80000);
  });
});
