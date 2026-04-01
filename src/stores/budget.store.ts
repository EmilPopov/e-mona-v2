import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { isOk } from '@/types/result';
import type {
  Budget,
  BudgetMonth,
  FixedCost,
  YearlyGoal,
  Category,
  IncomeEntry,
  AppliedFixedCost,
  AppliedGoalDeduction,
} from '@/types/types';
import * as budgetService from '@/services/budget.service';
import * as monthService from '@/services/month.service';
import * as fixedCostService from '@/services/fixed-cost.service';
import * as yearlyGoalService from '@/services/yearly-goal.service';
import * as categoryService from '@/services/category.service';
import { usePurchasesStore } from '@/stores/purchases.store';

export const useBudgetStore = defineStore('budget', () => {
  const budget = ref<Budget | null>(null);
  const currentMonth = ref<BudgetMonth | null>(null);
  const fixedCosts = ref<FixedCost[]>([]);
  const yearlyGoals = ref<YearlyGoal[]>([]);
  const categories = ref<Category[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const unsubs: (() => void)[] = [];

  // --- Computed budget math ---

  const spendingBudget = computed(() => {
    if (!currentMonth.value) return 0;
    return currentMonth.value.totalIncome
      - currentMonth.value.totalFixedCosts
      - currentMonth.value.totalGoalDeductions;
  });

  const remainingBalance = computed(() => {
    if (!currentMonth.value) return 0;
    return spendingBudget.value
      + currentMonth.value.rolloverAmount
      - currentMonth.value.totalPurchases;
  });

  const spentPercentage = computed(() => {
    const total = spendingBudget.value + (currentMonth.value?.rolloverAmount ?? 0);
    if (total <= 0) return 0;
    return Math.round(
      ((currentMonth.value?.totalPurchases ?? 0) / total) * 100,
    );
  });

  const activeFixedCosts = computed(() =>
    fixedCosts.value.filter((c) => c.isActive),
  );

  const activeYearlyGoals = computed(() =>
    yearlyGoals.value.filter((g) => g.isActive),
  );

  const activeCategories = computed(() =>
    categories.value.filter((c) => c.isActive),
  );

  const totalFixedCosts = computed(() =>
    activeFixedCosts.value.reduce((sum, c) => sum + c.amount, 0),
  );

  const totalGoalDeductions = computed(() =>
    activeYearlyGoals.value.reduce((sum, g) => sum + g.monthlyAmount, 0),
  );

  // --- Actions ---

  function cleanup(): void {
    for (const unsub of unsubs) {
      unsub();
    }
    unsubs.length = 0;
    budget.value = null;
    currentMonth.value = null;
    fixedCosts.value = [];
    yearlyGoals.value = [];
    categories.value = [];
    error.value = null;
  }

  /**
   * Loads a budget and subscribes to all its data.
   * Call this when the app starts and the user has an activeBudgetId.
   */
  async function loadBudget(budgetId: string): Promise<boolean> {
    cleanup();
    loading.value = true;
    error.value = null;

    try {
      // 1. Subscribe to budget document
      unsubs.push(
        budgetService.subscribeToBudget(budgetId, (b) => {
          budget.value = b;
          if (!b) {
            error.value = 'Budget not found or deleted.';
          }
        }),
      );

      // 2. Subscribe to categories
      unsubs.push(
        categoryService.subscribeToCategories(budgetId, (cats) => {
          categories.value = cats;
        }),
      );

      // 3. Subscribe to fixed costs
      unsubs.push(
        fixedCostService.subscribeToFixedCosts(budgetId, (costs) => {
          fixedCosts.value = costs;
        }),
      );

      // 4. Subscribe to yearly goals
      unsubs.push(
        yearlyGoalService.subscribeToYearlyGoals(budgetId, (goals) => {
          yearlyGoals.value = goals;
        }),
      );

      // 5. Load or create current month
      const monthId = monthService.getCurrentMonthId();
      await ensureCurrentMonth(budgetId, monthId);

      // 6. Subscribe to current month
      unsubs.push(
        monthService.subscribeToMonth(budgetId, monthId, (m) => {
          currentMonth.value = m;
        }),
      );

      // 7. Subscribe to purchases for current month
      const purchasesStore = usePurchasesStore();
      purchasesStore.subscribe(budgetId, monthId);

      loading.value = false;
      return true;
    } catch (e: unknown) {
      error.value = 'Failed to load budget data.';
      loading.value = false;
      return false;
    }
  }

  /**
   * Ensures the current month document exists. If not, creates a draft.
   * Returns true if the month is a new draft (needs review).
   */
  async function ensureCurrentMonth(
    budgetId: string,
    monthId: string,
  ): Promise<boolean> {
    const result = await monthService.getMonth(budgetId, monthId);
    if (!isOk(result)) {
      error.value = 'Failed to check current month.';
      return false;
    }

    if (result.data !== null) {
      // Month already exists
      return result.data.status === 'draft';
    }

    // Create a new draft month
    const authStore = useAuthStore();
    const userId = authStore.firebaseUser?.uid ?? '';

    // Get previous month's remaining balance for rollover
    const prevMonthId = getPreviousMonthId(monthId);
    let rolloverAmount = 0;
    if (prevMonthId) {
      const prevResult = await monthService.getMonth(budgetId, prevMonthId);
      if (isOk(prevResult) && prevResult.data) {
        const prev = prevResult.data;
        rolloverAmount = prev.spendingBudget + prev.rolloverAmount - prev.totalPurchases;
      }
    }

    // Build draft from previous month's incomes or empty
    let incomes: IncomeEntry[] = [];
    if (prevMonthId) {
      const prevResult = await monthService.getMonth(budgetId, prevMonthId);
      if (isOk(prevResult) && prevResult.data) {
        incomes = prevResult.data.incomes.map((i) => ({
          ...i,
          id: crypto.randomUUID(),
        }));
      }
    }

    // Snapshot active fixed costs
    const appliedFixedCosts: AppliedFixedCost[] = activeFixedCosts.value.map((c) => ({
      costId: c.id,
      name: c.name,
      amount: c.amount,
    }));

    // Snapshot active yearly goals with accumulated totals
    const appliedGoalDeductions: AppliedGoalDeduction[] = activeYearlyGoals.value.map((g) => ({
      goalId: g.id,
      name: g.name,
      monthlyAmount: g.monthlyAmount,
      accumulatedTotal: g.monthlyAmount, // Will be refined when we have history
    }));

    const createResult = await monthService.createDraftMonth(budgetId, monthId, {
      incomes,
      appliedFixedCosts,
      appliedGoalDeductions,
      rolloverAmount: Math.max(0, rolloverAmount),
      rolloverEnabled: rolloverAmount > 0,
    });

    if (!isOk(createResult)) {
      error.value = 'Failed to create monthly budget.';
      return false;
    }

    return true; // New draft — needs review
  }

  /** Confirms the current month's draft. */
  async function confirmCurrentMonth(
    incomes: IncomeEntry[],
    rolloverEnabled: boolean,
    rolloverAmount: number,
  ): Promise<boolean> {
    if (!budget.value || !currentMonth.value) return false;

    const authStore = useAuthStore();
    const userId = authStore.firebaseUser?.uid ?? '';

    const result = await monthService.confirmMonth(
      budget.value.id,
      currentMonth.value.id,
      userId,
      { incomes, rolloverEnabled, rolloverAmount },
    );

    return isOk(result);
  }

  /**
   * Creates a new budget via the setup wizard.
   */
  async function createBudget(
    name: string,
    currency: Budget['currency'],
  ): Promise<string | null> {
    const authStore = useAuthStore();
    const user = authStore.user;
    if (!user || !authStore.firebaseUser) return null;

    loading.value = true;
    const result = await budgetService.createBudget(
      name,
      currency,
      authStore.firebaseUser.uid,
      user.displayName,
      user.email,
    );
    loading.value = false;

    if (isOk(result)) {
      return result.data;
    }
    error.value = result.error.message;
    return null;
  }

  return {
    // State
    budget,
    currentMonth,
    fixedCosts,
    yearlyGoals,
    categories,
    loading,
    error,

    // Computed
    spendingBudget,
    remainingBalance,
    spentPercentage,
    activeFixedCosts,
    activeYearlyGoals,
    activeCategories,
    totalFixedCosts,
    totalGoalDeductions,

    // Actions
    loadBudget,
    ensureCurrentMonth,
    confirmCurrentMonth,
    createBudget,
    cleanup,
  };
});

function getPreviousMonthId(monthId: string): string | null {
  const [yearStr, monthStr] = monthId.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}
