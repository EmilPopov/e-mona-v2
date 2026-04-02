import type { Purchase } from '@/types/types';
import type { CurrencyCode } from '@/types/types';

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates CSV content from purchases.
 */
export function generatePurchasesCsv(purchases: Purchase[], currency: CurrencyCode): string {
  const rows: string[] = [];

  rows.push('Date,Purchase Note,Item,Category,Price,Quantity,Total,Added By');

  const sorted = [...purchases].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const purchase of sorted) {
    const date = formatDate(purchase.date);
    const note = purchase.note ?? '';

    for (const item of purchase.items) {
      const lineTotal = item.price * item.quantity;
      rows.push([
        date,
        escapeCsv(note),
        escapeCsv(item.name),
        escapeCsv(item.categoryName),
        formatAmount(item.price),
        String(item.quantity),
        formatAmount(lineTotal),
        escapeCsv(purchase.createdByName),
      ].join(','));
    }
  }

  return rows.join('\n');
}

/**
 * Exports purchases as CSV.
 * Web: triggers browser download.
 * Mobile (Capacitor): uses system share sheet.
 */
export async function exportPurchasesCsv(
  purchases: Purchase[],
  currency: CurrencyCode,
): Promise<void> {
  const csv = generatePurchasesCsv(purchases, currency);
  const now = new Date();
  const filename = `e-mona-export-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;

  // Web: blob download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
