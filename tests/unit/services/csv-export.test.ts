import { describe, it, expect } from 'vitest';
import { generatePurchasesCsv } from '@/services/csv-export.service';
import type { Purchase } from '@/types/types';

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'p1',
    date: new Date('2026-04-05'),
    createdBy: 'alice',
    createdByName: 'Alice',
    note: 'Lidl',
    items: [
      {
        id: 'i1',
        itemId: null,
        name: 'Bread',
        price: 150,
        quantity: 1,
        categoryId: 'food',
        categoryName: 'Food',
        categoryColor: '#4CAF50',
      },
    ],
    total: 150,
    createdAt: new Date('2026-04-05T10:00:00Z'),
    ...overrides,
  };
}

describe('generatePurchasesCsv', () => {
  it('includes header row', () => {
    const csv = generatePurchasesCsv([], 'EUR');
    expect(csv).toBe('Date,Purchase Note,Item,Category,Price,Quantity,Total,Added By');
  });

  it('generates correct CSV row for a simple purchase', () => {
    const purchases: Purchase[] = [makePurchase()];
    const csv = generatePurchasesCsv(purchases, 'EUR');
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-04-05,Lidl,Bread,Food,1.50,1,1.50,Alice');
  });

  it('formats cents correctly (1250 → 12.50)', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'Milk', price: 1250, quantity: 1, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
        total: 1250,
      }),
    ];
    const csv = generatePurchasesCsv(purchases, 'EUR');
    const lines = csv.split('\n');

    expect(lines[1]).toContain('12.50');
  });

  it('calculates line total as price * quantity', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'Water', price: 80, quantity: 3, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
        total: 240,
      }),
    ];
    const csv = generatePurchasesCsv(purchases, 'EUR');
    const lines = csv.split('\n');

    // price=0.80, qty=3, total=2.40
    expect(lines[1]).toBe('2026-04-05,Lidl,Water,Food,0.80,3,2.40,Alice');
  });

  it('generates one row per item, not per purchase', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'Bread', price: 150, quantity: 1, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
          { id: 'i2', itemId: null, name: 'Milk', price: 200, quantity: 2, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
        total: 550,
      }),
    ];

    const csv = generatePurchasesCsv(purchases, 'EUR');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 items
  });

  it('sorts output by date ascending', () => {
    const purchases: Purchase[] = [
      makePurchase({ id: 'p2', date: new Date('2026-04-10'), note: 'Later' }),
      makePurchase({ id: 'p1', date: new Date('2026-04-01'), note: 'Earlier' }),
    ];

    const csv = generatePurchasesCsv(purchases, 'EUR');
    const lines = csv.split('\n');
    expect(lines[1]).toContain('2026-04-01');
    expect(lines[2]).toContain('2026-04-10');
  });

  it('escapes values containing commas', () => {
    const purchases: Purchase[] = [
      makePurchase({
        note: 'Lidl, Kaufland',
        items: [
          { id: 'i1', itemId: null, name: 'Bread', price: 150, quantity: 1, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
      }),
    ];

    const csv = generatePurchasesCsv(purchases, 'EUR');
    expect(csv).toContain('"Lidl, Kaufland"');
  });

  it('escapes values containing double quotes', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: '12" Pizza', price: 1200, quantity: 1, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
      }),
    ];

    const csv = generatePurchasesCsv(purchases, 'EUR');
    expect(csv).toContain('"12"" Pizza"');
  });

  it('handles null note as empty string', () => {
    const purchases: Purchase[] = [makePurchase({ note: null })];
    const csv = generatePurchasesCsv(purchases, 'EUR');
    const lines = csv.split('\n');
    // Date,,Item... — empty note field
    expect(lines[1]).toContain('2026-04-05,,Bread');
  });

  it('handles zero-price items', () => {
    const purchases: Purchase[] = [
      makePurchase({
        items: [
          { id: 'i1', itemId: null, name: 'Free Sample', price: 0, quantity: 1, categoryId: 'food', categoryName: 'Food', categoryColor: '#4CAF50' },
        ],
        total: 0,
      }),
    ];

    const csv = generatePurchasesCsv(purchases, 'EUR');
    const lines = csv.split('\n');
    expect(lines[1]).toContain('0.00');
  });
});
