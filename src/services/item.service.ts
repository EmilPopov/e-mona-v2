import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';
import type { CatalogItem, CatalogItemCreate, CatalogItemUpdate } from '@/types/types';

function collectionRef(budgetId: string) {
  return collection(db, `budgets/${budgetId}/items`);
}

function firestoreToCatalogItem(id: string, data: Record<string, unknown>): CatalogItem {
  const lastUsedAt = data.lastUsedAt;
  return {
    id,
    name: data.name as string,
    nameLowercase: data.nameLowercase as string,
    defaultPrice: data.defaultPrice as number,
    categoryId: data.categoryId as string,
    icon: data.icon as string,
    isActive: data.isActive as boolean,
    lastUsedAt: lastUsedAt instanceof Timestamp ? lastUsedAt.toDate() : null,
  };
}

export function subscribeToItems(
  budgetId: string,
  callback: (items: CatalogItem[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const q = query(collectionRef(budgetId), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => firestoreToCatalogItem(d.id, d.data()));
      callback(items);
    },
    onError,
  );
}

export async function searchItems(
  budgetId: string,
  queryStr: string,
): Promise<Result<CatalogItem[]>> {
  try {
    const searchLower = queryStr.toLowerCase();
    const q = query(
      collectionRef(budgetId),
      where('nameLowercase', '>=', searchLower),
      where('nameLowercase', '<', searchLower + '\uf8ff'),
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs
      .map((d) => firestoreToCatalogItem(d.id, d.data()))
      .filter((item) => item.isActive);
    return ok(items);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function createItem(
  budgetId: string,
  data: CatalogItemCreate,
): Promise<Result<string>> {
  try {
    const docData = {
      ...data,
      nameLowercase: data.name.toLowerCase(),
      lastUsedAt: data.lastUsedAt ? Timestamp.fromDate(data.lastUsedAt) : null,
    };
    const docRef = await addDoc(collectionRef(budgetId), docData);
    return ok(docRef.id);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function updateItem(
  budgetId: string,
  itemId: string,
  updates: CatalogItemUpdate,
): Promise<Result<void>> {
  try {
    const docData: Record<string, unknown> = { ...updates };

    if (updates.name !== undefined) {
      docData.nameLowercase = updates.name.toLowerCase();
    }

    if (updates.lastUsedAt !== undefined) {
      docData.lastUsedAt = updates.lastUsedAt ? Timestamp.fromDate(updates.lastUsedAt) : null;
    }

    await updateDoc(doc(db, `budgets/${budgetId}/items`, itemId), docData);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function deactivateItem(
  budgetId: string,
  itemId: string,
): Promise<Result<void>> {
  try {
    await updateDoc(doc(db, `budgets/${budgetId}/items`, itemId), { isActive: false });
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

interface PurchaseItemInput {
  name: string;
  categoryId: string | null;
  price: number;
}

export async function autoSaveItems(
  budgetId: string,
  items: PurchaseItemInput[],
): Promise<Result<void>> {
  try {
    // Get all existing catalog items to check for duplicates
    const snapshot = await getDocs(collectionRef(budgetId));
    const existingNames = new Set<string>();
    for (const d of snapshot.docs) {
      const data = d.data();
      existingNames.add(data.nameLowercase as string);
    }

    // Filter to items that don't already exist in the catalog
    const newItems = items.filter(
      (item) => !existingNames.has(item.name.toLowerCase()),
    );

    if (newItems.length === 0) {
      return ok(undefined);
    }

    // Deduplicate within the incoming array (keep first occurrence)
    const seen = new Set<string>();
    const uniqueNewItems: PurchaseItemInput[] = [];
    for (const item of newItems) {
      const lower = item.name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueNewItems.push(item);
      }
    }

    // Batch create new catalog items
    const batch = writeBatch(db);
    const now = Timestamp.now();

    for (const item of uniqueNewItems) {
      const newDocRef = doc(collectionRef(budgetId));
      batch.set(newDocRef, {
        name: item.name,
        nameLowercase: item.name.toLowerCase(),
        defaultPrice: item.price,
        categoryId: item.categoryId ?? '',
        icon: '',
        isActive: true,
        lastUsedAt: now,
      });
    }

    await batch.commit();
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}
