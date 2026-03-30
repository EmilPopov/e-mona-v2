import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';
import type { Category, CategoryCreate, CategoryUpdate } from '@/types/types';

function collectionRef(budgetId: string) {
  return collection(db, `budgets/${budgetId}/categories`);
}

function firestoreToCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: data.name as string,
    color: data.color as string,
    icon: data.icon as string,
    parentCategoryId: (data.parentCategoryId as string) ?? null,
    sortOrder: data.sortOrder as number,
    isActive: data.isActive as boolean,
  };
}

export async function createCategory(
  budgetId: string,
  data: Omit<CategoryCreate, 'isActive' | 'parentCategoryId' | 'sortOrder'> & Partial<Pick<CategoryCreate, 'isActive' | 'parentCategoryId' | 'sortOrder'>>,
): Promise<Result<string>> {
  try {
    const docRef = await addDoc(collectionRef(budgetId), {
      name: data.name,
      color: data.color,
      icon: data.icon,
      parentCategoryId: data.parentCategoryId ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    });
    return ok(docRef.id);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function updateCategory(
  budgetId: string,
  categoryId: string,
  updates: CategoryUpdate,
): Promise<Result<void>> {
  try {
    await updateDoc(doc(db, `budgets/${budgetId}/categories`, categoryId), updates as Record<string, unknown>);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export function subscribeToCategories(
  budgetId: string,
  callback: (categories: Category[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const q = query(collectionRef(budgetId), orderBy('sortOrder'));
  return onSnapshot(
    q,
    (snapshot) => {
      const categories = snapshot.docs.map((d) => firestoreToCategory(d.id, d.data()));
      callback(categories);
    },
    onError,
  );
}
