import { computed } from 'vue';
import { useBudgetStore } from '@/stores/budget.store';
import type { BudgetMonth } from '@/types/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Composable for month formatting utilities
 */
export function useMonthFormat() {
  const budgetStore = useBudgetStore();

  /**
   * Formats a month object into a readable label (e.g., "January 26")
   */
  function formatMonthLabel(month: BudgetMonth, shortYear = true): string {
    if (!month) return '';
    const monthName = MONTH_NAMES[month.month - 1];
    const year = shortYear ? String(month.year).slice(2) : String(month.year);
    const day = getTodayDay();
    return `${monthName} ${day}`;
  }

  /**
   * Gets the day of month from a date (1-31)
   */
  function getDayOfMonth(date: Date = new Date()): number {
    return date.getDate();
  }

  /**
   * Gets today's day of month (1-31)
   */
  function getTodayDay(): number {
    return new Date().getDate();
  }

  /**
   * Current month label from budget store (e.g., "January 26")
   */
  const monthLabel = computed(() => {
    const m = budgetStore.currentMonth;
    if (!m) return '';
    return formatMonthLabel(m);
  });

  return {
    formatMonthLabel,
    getDayOfMonth,
    getTodayDay,
    monthLabel,
    MONTH_NAMES,
  };
}