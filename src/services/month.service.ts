import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';
import type {
  BudgetMonth,
  BudgetMonthUpdate,
  IncomeEntry,
  AppliedFixedCost,
  AppliedGoalDeduction,
} from '@/types/types';

function docRef(budgetId: string, monthId: string) {
  return doc(db, `budgets/${budgetId}/months`, monthId);
}

function firestoreToMonth(id: string, data: Record<string, unknown>): BudgetMonth {
  return {
    id,
    year: data.year as number,
    month: data.month as number,
    status: data.status as BudgetMonth['status'],
    incomes: data.incomes as IncomeEntry[],
    totalIncome: data.totalIncome as number,
    totalFixedCosts: data.totalFixedCosts as number,
    totalGoalDeductions: data.totalGoalDeductions as number,
    totalPurchases: data.totalPurchases as number,
    spendingBudget: data.spendingBudget as number,
    rolloverAmount: data.rolloverAmount as number,
    rolloverEnabled: data.rolloverEnabled as boolean,
    confirmedAt: data.confirmedAt instanceof Timestamp
      ? data.confirmedAt.toDate()
      : (data.confirmedAt as Date | null),
    confirmedBy: (data.confirmedBy as string) ?? null,
    appliedFixedCosts: data.appliedFixedCosts as AppliedFixedCost[],
    appliedGoalDeductions: data.appliedGoalDeductions as AppliedGoalDeduction[],
    alerts: data.alerts as BudgetMonth['alerts'],
  };
}

export function getCurrentMonthId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function getMonth(
  budgetId: string,
  monthId: string,
): Promise<Result<BudgetMonth | null>> {
  try {
    const snapshot = await getDoc(docRef(budgetId, monthId));
    if (!snapshot.exists()) {
      return ok(null);
    }
    return ok(firestoreToMonth(snapshot.id, snapshot.data()));
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Creates a new draft month from the given parameters.
 */
export async function createDraftMonth(
  budgetId: string,
  monthId: string,
  params: {
    incomes: IncomeEntry[];
    appliedFixedCosts: AppliedFixedCost[];
    appliedGoalDeductions: AppliedGoalDeduction[];
    rolloverAmount: number;
    rolloverEnabled: boolean;
  },
): Promise<Result<BudgetMonth>> {
  try {
    const [yearStr, monthStr] = monthId.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const totalIncome = params.incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalFixedCosts = params.appliedFixedCosts.reduce((sum, c) => sum + c.amount, 0);
    const totalGoalDeductions = params.appliedGoalDeductions.reduce((sum, g) => sum + g.monthlyAmount, 0);
    const spendingBudget = totalIncome - totalFixedCosts - totalGoalDeductions;

    const monthData: Omit<BudgetMonth, 'id'> = {
      year,
      month,
      status: 'draft',
      incomes: params.incomes,
      totalIncome,
      totalFixedCosts,
      totalGoalDeductions,
      totalPurchases: 0,
      spendingBudget,
      rolloverAmount: params.rolloverEnabled ? params.rolloverAmount : 0,
      rolloverEnabled: params.rolloverEnabled,
      confirmedAt: null,
      confirmedBy: null,
      appliedFixedCosts: params.appliedFixedCosts,
      appliedGoalDeductions: params.appliedGoalDeductions,
      alerts: { eightyPercentSent: false, overspentSent: false },
    };

    await setDoc(docRef(budgetId, monthId), monthData);
    return ok({ id: monthId, ...monthData });
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Confirms a draft month — sets status to "active" and records confirmation.
 */
export async function confirmMonth(
  budgetId: string,
  monthId: string,
  userId: string,
  updates: {
    incomes: IncomeEntry[];
    rolloverEnabled: boolean;
    rolloverAmount: number;
  },
): Promise<Result<void>> {
  try {
    const totalIncome = updates.incomes.reduce((sum, i) => sum + i.amount, 0);
    const existing = await getDoc(docRef(budgetId, monthId));
    if (!existing.exists()) {
      return fail({ code: 'firestore/not-found', message: 'Month not found.' });
    }
    const data = existing.data();
    const totalFixedCosts = data.totalFixedCosts as number;
    const totalGoalDeductions = data.totalGoalDeductions as number;
    const rolloverAmount = updates.rolloverEnabled ? updates.rolloverAmount : 0;
    const spendingBudget = totalIncome - totalFixedCosts - totalGoalDeductions;

    await updateDoc(docRef(budgetId, monthId), {
      status: 'active',
      incomes: updates.incomes,
      totalIncome,
      spendingBudget,
      rolloverAmount,
      rolloverEnabled: updates.rolloverEnabled,
      confirmedAt: Timestamp.now(),
      confirmedBy: userId,
    });
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function updateMonth(
  budgetId: string,
  monthId: string,
  updates: BudgetMonthUpdate,
): Promise<Result<void>> {
  try {
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.confirmedAt instanceof Date) {
      updateData.confirmedAt = Timestamp.fromDate(updates.confirmedAt);
    }
    await updateDoc(docRef(budgetId, monthId), updateData);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export function subscribeToMonth(
  budgetId: string,
  monthId: string,
  callback: (month: BudgetMonth | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    docRef(budgetId, monthId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(firestoreToMonth(snapshot.id, snapshot.data()));
      } else {
        callback(null);
      }
    },
    onError,
  );
}
