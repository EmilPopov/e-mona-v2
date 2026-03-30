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
import type { FixedCost, FixedCostCreate, FixedCostUpdate } from '@/types/types';

function collectionRef(budgetId: string) {
  return collection(db, `budgets/${budgetId}/fixedCosts`);
}

function firestoreToFixedCost(id: string, data: Record<string, unknown>): FixedCost {
  return {
    id,
    name: data.name as string,
    amount: data.amount as number,
    categoryId: data.categoryId as string,
    icon: data.icon as string,
    isActive: data.isActive as boolean,
    createdBy: data.createdBy as string,
  };
}

export async function createFixedCost(
  budgetId: string,
  data: FixedCostCreate,
): Promise<Result<string>> {
  try {
    const docRef = await addDoc(collectionRef(budgetId), data);
    return ok(docRef.id);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function updateFixedCost(
  budgetId: string,
  costId: string,
  updates: FixedCostUpdate,
): Promise<Result<void>> {
  try {
    await updateDoc(doc(db, `budgets/${budgetId}/fixedCosts`, costId), updates as Record<string, unknown>);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function deleteFixedCost(
  budgetId: string,
  costId: string,
): Promise<Result<void>> {
  try {
    await deleteDoc(doc(db, `budgets/${budgetId}/fixedCosts`, costId));
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export function subscribeToFixedCosts(
  budgetId: string,
  callback: (costs: FixedCost[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    query(collectionRef(budgetId)),
    (snapshot) => {
      const costs = snapshot.docs.map((d) => firestoreToFixedCost(d.id, d.data()));
      callback(costs);
    },
    onError,
  );
}

export function subscribeToActiveFixedCosts(
  budgetId: string,
  callback: (costs: FixedCost[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const q = query(collectionRef(budgetId), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const costs = snapshot.docs.map((d) => firestoreToFixedCost(d.id, d.data()));
      callback(costs);
    },
    onError,
  );
}
