import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';
import type { YearlyGoal, YearlyGoalCreate, YearlyGoalUpdate } from '@/types/types';

function collectionRef(budgetId: string) {
  return collection(db, `budgets/${budgetId}/yearlyGoals`);
}

function firestoreToYearlyGoal(id: string, data: Record<string, unknown>): YearlyGoal {
  return {
    id,
    name: data.name as string,
    targetAmount: data.targetAmount as number,
    monthlyAmount: data.monthlyAmount as number,
    categoryId: data.categoryId as string,
    icon: data.icon as string,
    startMonth: data.startMonth as string,
    isActive: data.isActive as boolean,
    createdBy: data.createdBy as string,
  };
}

export async function createYearlyGoal(
  budgetId: string,
  data: Omit<YearlyGoalCreate, 'monthlyAmount'>,
): Promise<Result<string>> {
  try {
    const docRef = await addDoc(collectionRef(budgetId), {
      ...data,
      monthlyAmount: Math.round(data.targetAmount / 12),
    });
    return ok(docRef.id);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function updateYearlyGoal(
  budgetId: string,
  goalId: string,
  updates: YearlyGoalUpdate,
): Promise<Result<void>> {
  try {
    const updateData: Record<string, unknown> = { ...updates };
    // Recalculate monthlyAmount if targetAmount changes
    if (updates.targetAmount !== undefined) {
      updateData.monthlyAmount = Math.round(updates.targetAmount / 12);
    }
    await updateDoc(doc(db, `budgets/${budgetId}/yearlyGoals`, goalId), updateData);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function deleteYearlyGoal(
  budgetId: string,
  goalId: string,
): Promise<Result<void>> {
  try {
    await deleteDoc(doc(db, `budgets/${budgetId}/yearlyGoals`, goalId));
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export function subscribeToYearlyGoals(
  budgetId: string,
  callback: (goals: YearlyGoal[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    query(collectionRef(budgetId)),
    (snapshot) => {
      const goals = snapshot.docs.map((d) => firestoreToYearlyGoal(d.id, d.data()));
      callback(goals);
    },
    onError,
  );
}

export function subscribeToActiveYearlyGoals(
  budgetId: string,
  callback: (goals: YearlyGoal[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const q = query(collectionRef(budgetId), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const goals = snapshot.docs.map((d) => firestoreToYearlyGoal(d.id, d.data()));
      callback(goals);
    },
    onError,
  );
}
