import { describe, it, expect } from 'vitest';
import {
  spendingByCategory,
  dailySpending,
  monthlyTrend,
  spendingByMember,
  topItems,
  budgetHealth,
} from '@/composables/useAnalytics';
import type { Purchase, BudgetMonth } from '@/types/types';

// ── Test data factories ─────────────────────────────────────────────

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'p1',
    date: new Date('2026-04-05'),
    createdBy: 'alice',
    createdByName: 'Alice',
    note: null,
    items: [
      {
        id: 'i1',
        itemId: null,
        name: 'Bread',
        price: 150,
        quantity: 1,
        categoryId: 'cat-food',
        categoryName: 'Food',
        categoryColor: '#4CAF50',
      },
    ],
    total: 150,
    createdAt: new Date('2026-04-05T10:00:00Z'),
    ...overrides,
  };
}

function makeMonth(overrides: Partial<BudgetMonth> = {}): BudgetMonth {
  return {
    id: '2026-04',
    year: 2026,
    month: 4,
    status: 'active',
    incomes: [{ id: 'inc1', label: 'Salary', amount: 500000 }],
    totalIncome: 500000,
    totalFixedCosts: 120000,
    totalGoalDeductions: 30000,
    totalPurchases: 100000,
    spendingBudget: 350000,
    rolloverAmount: 0,
    rolloverEnabled: false,
    confirmedAt: new Date(),
    confirmedBy: 'alice',
    appliedFixedCosts: [],
    appliedGoalDeductions: [],
    alerts: { eightyPercentSent: false, overspentSent: false },
    ...overrides,
  };
}

// ── spendingByCategory ──────────────────────────────────────────────

describe('spendingByCategory', () => {
  it('aggregates items by category', () => {
    const purchases: Purchase[] = [
      makePurchase({
        id: 'p1',
        items: [
          { id: 'i1', itemId: null, name: 'Bread', price: 150, quantity: 2, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
          { id: 'i2', itemId: null, name: 'Soap', price: 300, quantity: 1, categoryId: 'household', categoryName: 'Household', categoryColor: '#2196F3' },
        ],
        total: 600,
      }),
      makePurchase({
        id: 'p2',
        items: [
          { id: 'i3', itemId: null, name: 'Milk', price: 200, quantity: 1, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
        total: 200,
      }),
    ];

    const result = spendingByCategory(purchases);

    expect(result).toHaveLength(2);
    // Food: 150*2 + 200*1 = 500
    const food = result.find((r) => r.categoryId === 'food');
    expect(food?.total).toBe(500);
    // Household: 300*1 = 300
    const household = result.find((r) => r.categoryId === 'household');
    expect(household?.total).toBe(300);
  });

  it('returns sorted by total descending', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'A', price: 100, quantity: 1, categoryId: 'small', categoryName: 'Small', categoryColor: '#aaa' },
          { id: 'i2', itemId: null, name: 'B', price: 500, quantity: 1, categoryId: 'big', categoryName: 'Big', categoryColor: '#bbb' },
        ],
        total: 600,
      }),
    ];

    const result = spendingByCategory(purchases);
    expect(result[0].categoryId).toBe('big');
    expect(result[1].categoryId).toBe('small');
  });

  it('calculates correct percentages', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'A', price: 750, quantity: 1, categoryId: 'a', categoryName: 'A', categoryColor: '#aaa' },
          { id: 'i2', itemId: null, name: 'B', price: 250, quantity: 1, categoryId: 'b', categoryName: 'B', categoryColor: '#bbb' },
        ],
        total: 1000,
      }),
    ];

    const result = spendingByCategory(purchases);
    expect(result.find((r) => r.categoryId === 'a')?.percentage).toBe(75);
    expect(result.find((r) => r.categoryId === 'b')?.percentage).toBe(25);
  });

  it('returns empty array for no purchases', () => {
    expect(spendingByCategory([])).toEqual([]);
  });

  it('handles zero total gracefully (no division by zero)', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'Free', price: 0, quantity: 1, categoryId: 'free', categoryName: 'Free', categoryColor: '#000' },
        ],
        total: 0,
      }),
    ];

    const result = spendingByCategory(purchases);
    expect(result[0].percentage).toBe(0);
  });
});

// ── dailySpending ───────────────────────────────────────────────────

describe('dailySpending', () => {
  it('returns entries for every day of the month', () => {
    const result = dailySpending([], 2026, 4); // April = 30 days
    expect(result).toHaveLength(30);
  });

  it('returns 31 entries for January', () => {
    const result = dailySpending([], 2026, 1);
    expect(result).toHaveLength(31);
  });

  it('returns 28 entries for February in a non-leap year', () => {
    const result = dailySpending([], 2025, 2);
    expect(result).toHaveLength(28);
  });

  it('aggregates purchase totals per day', () => {
    const purchases: Purchase[] = [
      makePurchase({ id: 'p1', date: new Date('2026-04-05'), total: 500 }),
      makePurchase({ id: 'p2', date: new Date('2026-04-05'), total: 300 }),
      makePurchase({ id: 'p3', date: new Date('2026-04-10'), total: 200 }),
    ];

    const result = dailySpending(purchases, 2026, 4);
    const day5 = result.find((d) => d.date === '2026-04-05');
    const day10 = result.find((d) => d.date === '2026-04-10');
    const day1 = result.find((d) => d.date === '2026-04-01');

    expect(day5?.total).toBe(800);
    expect(day10?.total).toBe(200);
    expect(day1?.total).toBe(0);
  });

  it('formats labels correctly', () => {
    const result = dailySpending([], 2026, 4);
    expect(result[0].label).toBe('Apr 1');
    expect(result[14].label).toBe('Apr 15');
  });
});

// ── monthlyTrend ────────────────────────────────────────────────────

describe('monthlyTrend', () => {
  it('returns months sorted by id ascending', () => {
    const months: BudgetMonth[] = [
      makeMonth({ id: '2026-03', month: 3, totalPurchases: 200000, spendingBudget: 350000 }),
      makeMonth({ id: '2026-01', month: 1, totalPurchases: 100000, spendingBudget: 350000 }),
      makeMonth({ id: '2026-02', month: 2, totalPurchases: 150000, spendingBudget: 350000 }),
    ];

    const result = monthlyTrend(months);
    expect(result.map((m) => m.monthId)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('includes correct labels', () => {
    const months: BudgetMonth[] = [
      makeMonth({ id: '2026-01', month: 1 }),
      makeMonth({ id: '2026-12', month: 12 }),
    ];

    const result = monthlyTrend(months);
    expect(result[0].label).toBe('Jan');
    expect(result[1].label).toBe('Dec');
  });

  it('returns empty array for no months', () => {
    expect(monthlyTrend([])).toEqual([]);
  });
});

// ── spendingByMember ────────────────────────────────────────────────

describe('spendingByMember', () => {
  it('aggregates spending per member', () => {
    const purchases: Purchase[] = [
      makePurchase({ id: 'p1', createdBy: 'alice', createdByName: 'Alice', total: 500 }),
      makePurchase({ id: 'p2', createdBy: 'bob', createdByName: 'Bob', total: 300 }),
      makePurchase({ id: 'p3', createdBy: 'alice', createdByName: 'Alice', total: 200 }),
    ];

    const result = spendingByMember(purchases);
    expect(result).toHaveLength(2);

    const alice = result.find((m) => m.userId === 'alice');
    expect(alice?.total).toBe(700);
    expect(alice?.percentage).toBe(70);

    const bob = result.find((m) => m.userId === 'bob');
    expect(bob?.total).toBe(300);
    expect(bob?.percentage).toBe(30);
  });

  it('returns sorted by total descending', () => {
    const purchases: Purchase[] = [
      makePurchase({ id: 'p1', createdBy: 'alice', createdByName: 'Alice', total: 100 }),
      makePurchase({ id: 'p2', createdBy: 'bob', createdByName: 'Bob', total: 500 }),
    ];

    const result = spendingByMember(purchases);
    expect(result[0].userId).toBe('bob');
  });

  it('returns empty for no purchases', () => {
    expect(spendingByMember([])).toEqual([]);
  });
});

// ── topItems ────────────────────────────────────────────────────────

describe('topItems', () => {
  it('aggregates items by lowercase name', () => {
    const purchases: Purchase[] = [
      makePurchase({
        id: 'p1',
        items: [
          { id: 'i1', itemId: null, name: 'Bread', price: 150, quantity: 2, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
        total: 300,
      }),
      makePurchase({
        id: 'p2',
        items: [
          { id: 'i2', itemId: null, name: 'bread', price: 160, quantity: 1, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
        total: 160,
      }),
    ];

    const result = topItems(purchases);
    expect(result).toHaveLength(1);
    // total: 150*2 + 160*1 = 460, count: 2+1 = 3
    expect(result[0].total).toBe(460);
    expect(result[0].count).toBe(3);
  });

  it('respects limit parameter', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `i${i}`,
      itemId: null,
      name: `Item${i}`,
      price: (i + 1) * 100,
      quantity: 1,
      categoryId: 'cat',
      categoryName: 'Cat',
      categoryColor: '#000',
    }));

    const purchases: Purchase[] = [
      makePurchase({ items, total: items.reduce((s, i) => s + i.price, 0) }),
    ];

    const result = topItems(purchases, 5);
    expect(result).toHaveLength(5);
  });

  it('returns sorted by total descending', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'Cheap', price: 50, quantity: 1, categoryId: 'a', categoryName: 'A', categoryColor: '#aaa' },
          { id: 'i2', itemId: null, name: 'Expensive', price: 999, quantity: 1, categoryId: 'a', categoryName: 'A', categoryColor: '#aaa' },
        ],
        total: 1049,
      }),
    ];

    const result = topItems(purchases);
    expect(result[0].name).toBe('Expensive');
  });
});

// ── budgetHealth ────────────────────────────────────────────────────

describe('budgetHealth', () => {
  it('calculates remaining balance correctly', () => {
    const month = makeMonth({ spendingBudget: 350000, rolloverAmount: 50000 });
    const result = budgetHealth(month, 150000);

    // budget = 350000 + 50000 = 400000, remaining = 400000 - 150000 = 250000
    expect(result.remainingBalance).toBe(250000);
    expect(result.spendingBudget).toBe(400000);
    expect(result.totalPurchases).toBe(150000);
  });

  it('returns green status when spending is low', () => {
    const month = makeMonth({ spendingBudget: 350000, rolloverAmount: 0 });
    // 10% spent
    const result = budgetHealth(month, 35000);
    expect(result.status).toBe('green');
  });

  it('returns red status when overspent', () => {
    const month = makeMonth({ spendingBudget: 350000, rolloverAmount: 0 });
    // Over 100%
    const result = budgetHealth(month, 400000);
    expect(result.status).toBe('red');
    expect(result.remainingBalance).toBeLessThan(0);
  });

  it('returns red status when over 90%', () => {
    const month = makeMonth({ spendingBudget: 100000, rolloverAmount: 0 });
    // 95% spent
    const result = budgetHealth(month, 95000);
    expect(result.status).toBe('red');
  });

  it('calculates spentPercentage correctly', () => {
    const month = makeMonth({ spendingBudget: 200000, rolloverAmount: 0 });
    const result = budgetHealth(month, 50000);
    expect(result.spentPercentage).toBe(25);
  });

  it('handles zero budget without division error', () => {
    const month = makeMonth({ spendingBudget: 0, rolloverAmount: 0 });
    const result = budgetHealth(month, 0);
    expect(result.spentPercentage).toBe(0);
  });

  it('calculates safeToSpend as zero when no days remaining', () => {
    // Use a past month so all days are elapsed
    const month = makeMonth({
      id: '2025-01',
      year: 2025,
      month: 1,
      spendingBudget: 350000,
      rolloverAmount: 0,
    });
    const result = budgetHealth(month, 100000);
    expect(result.daysRemaining).toBe(0);
    expect(result.safeToSpend).toBe(0);
  });

  it('rounds dailyAverage and safeToSpend to integers', () => {
    const month = makeMonth({ spendingBudget: 350000, rolloverAmount: 0 });
    const result = budgetHealth(month, 100000);
    expect(Number.isInteger(result.dailyAverage)).toBe(true);
    expect(Number.isInteger(result.safeToSpend)).toBe(true);
    expect(Number.isInteger(result.projectedRemaining)).toBe(true);
  });
});
