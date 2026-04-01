import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';
import type {
  Purchase,
  PurchaseCreate,
  PurchaseUpdate,
  PurchaseItem,
} from '@/types/types';

function collectionRef(budgetId: string, monthId: string) {
  return collection(db, `budgets/${budgetId}/months/${monthId}/purchases`);
}

function monthDocRef(budgetId: string, monthId: string) {
  return doc(db, `budgets/${budgetId}/months`, monthId);
}

function firestoreToItem(data: Record<string, unknown>): PurchaseItem {
  return {
    id: data.id as string,
    itemId: (data.itemId as string) ?? null,
    name: data.name as string,
    price: data.price as number,
    quantity: data.quantity as number,
    categoryId: data.categoryId as string,
    categoryName: data.categoryName as string,
    categoryColor: data.categoryColor as string,
  };
}

function firestoreToPurchase(id: string, data: Record<string, unknown>): Purchase {
  const rawItems = data.items as Record<string, unknown>[];
  return {
    id,
    date: data.date instanceof Timestamp
      ? data.date.toDate()
      : data.date as Date,
    createdBy: data.createdBy as string,
    createdByName: data.createdByName as string,
    note: (data.note as string) ?? null,
    items: rawItems.map(firestoreToItem),
    total: data.total as number,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : data.createdAt as Date,
  };
}

function purchaseToFirestore(data: PurchaseCreate): Record<string, unknown> {
  return {
    date: Timestamp.fromDate(data.date),
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    note: data.note,
    items: data.items,
    total: data.total,
    createdAt: Timestamp.fromDate(data.createdAt),
  };
}

/**
 * Creates a purchase and increments the month's totalPurchases.
 * Uses two sequential writes: first creates the purchase doc,
 * then increments the month total. If the increment fails,
 * the Cloud Function will reconcile.
 */
export async function createPurchase(
  budgetId: string,
  monthId: string,
  data: PurchaseCreate,
): Promise<Result<string>> {
  try {
    const docRef = await addDoc(
      collectionRef(budgetId, monthId),
      purchaseToFirestore(data),
    );

    // Increment month totalPurchases — best effort, Cloud Function reconciles
    await updateDoc(monthDocRef(budgetId, monthId), {
      totalPurchases: increment(data.total),
    });

    return ok(docRef.id);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Real-time listener for purchases in a month, ordered by date descending.
 */
export function subscribeToPurchases(
  budgetId: string,
  monthId: string,
  callback: (purchases: Purchase[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const q = query(collectionRef(budgetId, monthId), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const purchases = snapshot.docs.map((d) =>
        firestoreToPurchase(d.id, d.data()),
      );
      callback(purchases);
    },
    onError,
  );
}

/**
 * Deletes a purchase and decrements the month's totalPurchases.
 */
export async function deletePurchase(
  budgetId: string,
  monthId: string,
  purchaseId: string,
  purchaseTotal: number,
): Promise<Result<void>> {
  try {
    await deleteDoc(
      doc(db, `budgets/${budgetId}/months/${monthId}/purchases`, purchaseId),
    );

    await updateDoc(monthDocRef(budgetId, monthId), {
      totalPurchases: increment(-purchaseTotal),
    });

    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Updates a purchase. If the total changed, also adjusts the month's totalPurchases.
 * @param totalDiff — The difference (newTotal - oldTotal). Pass 0 if total didn't change.
 */
export async function updatePurchase(
  budgetId: string,
  monthId: string,
  purchaseId: string,
  updates: PurchaseUpdate,
  totalDiff: number,
): Promise<Result<void>> {
  try {
    const updateData: Record<string, unknown> = { ...updates };

    // Convert Date fields to Firestore Timestamps
    if (updates.date instanceof Date) {
      updateData.date = Timestamp.fromDate(updates.date);
    }

    await updateDoc(
      doc(db, `budgets/${budgetId}/months/${monthId}/purchases`, purchaseId),
      updateData,
    );

    if (totalDiff !== 0) {
      await updateDoc(monthDocRef(budgetId, monthId), {
        totalPurchases: increment(totalDiff),
      });
    }

    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * One-time fetch of all purchases for a month.
 */
export async function getPurchases(
  budgetId: string,
  monthId: string,
): Promise<Result<Purchase[]>> {
  try {
    const q = query(collectionRef(budgetId, monthId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    const purchases = snapshot.docs.map((d) =>
      firestoreToPurchase(d.id, d.data()),
    );
    return ok(purchases);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}
