import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budget.store';
import { usePurchasesStore } from '@/stores/purchases.store';
import type { Purchase, BudgetMonth } from '@/types/types';

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

export interface DailySpending {
  date: string; // "YYYY-MM-DD"
  label: string; // "Mar 5"
  total: number;
}

export interface MonthlyTrend {
  monthId: string;
  label: string; // "Jan", "Feb"
  totalPurchases: number;
  spendingBudget: number;
}

export interface MemberSpending {
  userId: string;
  displayName: string;
  total: number;
  percentage: number;
}

export interface ItemRanking {
  name: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  count: number;
}

export interface BudgetHealth {
  remainingBalance: number;
  spendingBudget: number;
  totalPurchases: number;
  spentPercentage: number;
  daysRemaining: number;
  daysElapsed: number;
  dailyAverage: number;
  safeToSpend: number;
  projectedRemaining: number;
  status: 'green' | 'yellow' | 'red';
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function spendingByCategory(purchases: Purchase[]): CategorySpending[] {
  const map = new Map<string, { name: string; color: string; total: number }>();

  for (const purchase of purchases) {
    for (const item of purchase.items) {
      const existing = map.get(item.categoryId);
      const itemTotal = item.price * item.quantity;
      if (existing) {
        existing.total += itemTotal;
      } else {
        map.set(item.categoryId, {
          name: item.categoryName,
          color: item.categoryColor,
          total: itemTotal,
        });
      }
    }
  }

  const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0);

  return Array.from(map.entries())
    .map(([categoryId, v]) => ({
      categoryId,
      categoryName: v.name,
      categoryColor: v.color,
      total: v.total,
      percentage: grandTotal > 0 ? Math.round((v.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function dailySpending(purchases: Purchase[], year: number, month: number): DailySpending[] {
  const days = daysInMonth(year, month);
  const map = new Map<string, number>();

  for (const p of purchases) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + p.total);
  }

  const result: DailySpending[] = [];
  for (let day = 1; day <= days; day++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    result.push({
      date: key,
      label: `${MONTH_SHORT[month - 1]} ${day}`,
      total: map.get(key) ?? 0,
    });
  }

  return result;
}

export function monthlyTrend(months: BudgetMonth[]): MonthlyTrend[] {
  return months
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({
      monthId: m.id,
      label: MONTH_SHORT[m.month - 1],
      totalPurchases: m.totalPurchases,
      spendingBudget: m.spendingBudget,
    }));
}

export function spendingByMember(purchases: Purchase[]): MemberSpending[] {
  const map = new Map<string, { name: string; total: number }>();

  for (const p of purchases) {
    const existing = map.get(p.createdBy);
    if (existing) {
      existing.total += p.total;
    } else {
      map.set(p.createdBy, { name: p.createdByName, total: p.total });
    }
  }

  const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0);

  return Array.from(map.entries())
    .map(([userId, v]) => ({
      userId,
      displayName: v.name,
      total: v.total,
      percentage: grandTotal > 0 ? Math.round((v.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function topItems(purchases: Purchase[], limit: number = 10): ItemRanking[] {
  const map = new Map<string, ItemRanking>();

  for (const purchase of purchases) {
    for (const item of purchase.items) {
      const key = item.name.toLowerCase();
      const existing = map.get(key);
      const itemTotal = item.price * item.quantity;
      if (existing) {
        existing.total += itemTotal;
        existing.count += item.quantity;
      } else {
        map.set(key, {
          name: item.name,
          categoryName: item.categoryName,
          categoryColor: item.categoryColor,
          total: itemTotal,
          count: item.quantity,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function budgetHealth(month: BudgetMonth, totalPurchases: number): BudgetHealth {
  const now = new Date();
  const days = daysInMonth(month.year, month.month);
  const currentDay = (now.getFullYear() === month.year && now.getMonth() + 1 === month.month)
    ? Math.min(now.getDate(), days)
    : days; // Past month — use all days

  const budget = month.spendingBudget + month.rolloverAmount;
  const remaining = budget - totalPurchases;
  const daysElapsed = Math.max(currentDay, 1);
  const daysRemaining = Math.max(days - currentDay, 0);
  const dailyAverage = totalPurchases / daysElapsed;
  const safeToSpend = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const projectedRemaining = remaining - (dailyAverage * daysRemaining);
  const spentPct = budget > 0 ? Math.round((totalPurchases / budget) * 100) : 0;

  let status: BudgetHealth['status'] = 'green';
  if (remaining < 0 || spentPct > 90) {
    status = 'red';
  } else if (spentPct > 70 || dailyAverage > (budget / days) * 1.2) {
    status = 'yellow';
  }

  return {
    remainingBalance: remaining,
    spendingBudget: budget,
    totalPurchases,
    spentPercentage: spentPct,
    daysRemaining,
    daysElapsed,
    dailyAverage: Math.round(dailyAverage),
    safeToSpend: Math.max(0, Math.round(safeToSpend)),
    projectedRemaining: Math.round(projectedRemaining),
    status,
  };
}

/**
 * Composable providing reactive analytics computed from current store state.
 */
export function useAnalytics() {
  const budgetStore = useBudgetStore();
  const purchasesStore = usePurchasesStore();

  const categoryBreakdown = computed(() =>
    spendingByCategory(purchasesStore.purchases),
  );

  const daily = computed(() => {
    const m = budgetStore.currentMonth;
    if (!m) return [];
    return dailySpending(purchasesStore.purchases, m.year, m.month);
  });

  const memberBreakdown = computed(() =>
    spendingByMember(purchasesStore.purchases),
  );

  const topItemsList = computed(() =>
    topItems(purchasesStore.purchases, 10),
  );

  const health = computed(() => {
    const m = budgetStore.currentMonth;
    if (!m) return null;
    return budgetHealth(m, purchasesStore.monthTotal);
  });

  const isMultiMember = computed(() =>
    (budgetStore.budget?.memberIds.length ?? 0) > 1,
  );

  return {
    categoryBreakdown,
    daily,
    memberBreakdown,
    topItemsList,
    health,
    isMultiMember,
  };
}
