import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';
import { BudgetCreateSchema } from '@/types/schemas';
import type { Budget, BudgetUpdate } from '@/types/types';
import { DEFAULT_CATEGORIES } from '@/config/default-categories';
import { DEFAULT_ITEMS } from '@/config/default-items';

function firestoreToBudget(id: string, data: Record<string, unknown>): Budget {
  const members = data.members as Record<string, Record<string, unknown>> ?? {};
  const converted: Budget['members'] = {};
  for (const [uid, member] of Object.entries(members)) {
    converted[uid] = {
      role: member.role as Budget['members'][string]['role'],
      displayName: member.displayName as string,
      email: member.email as string,
      joinedAt: member.joinedAt instanceof Timestamp
        ? member.joinedAt.toDate()
        : member.joinedAt as Date,
    };
  }

  return {
    id,
    name: data.name as string,
    currency: data.currency as Budget['currency'],
    createdBy: data.createdBy as string,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : data.createdAt as Date,
    memberIds: data.memberIds as string[],
    members: converted,
  };
}

/**
 * Creates a budget, seeds default categories & items, and updates user's activeBudgetId.
 */
export async function createBudget(
  name: string,
  currency: Budget['currency'],
  userId: string,
  userDisplayName: string,
  userEmail: string,
): Promise<Result<string>> {
  try {
    const now = new Date();
    const budgetData = {
      name,
      currency,
      createdBy: userId,
      createdAt: now,
      memberIds: [userId],
      members: {
        [userId]: {
          role: 'admin' as const,
          displayName: userDisplayName,
          email: userEmail,
          joinedAt: now,
        },
      },
    };

    const parsed = BudgetCreateSchema.safeParse(budgetData);
    if (!parsed.success) {
      return fail({ code: 'validation/error', message: 'Invalid budget data.' });
    }

    const budgetRef = doc(collection(db, 'budgets'));
    const budgetId = budgetRef.id;
    const batch = writeBatch(db);

    // 1. Create the budget document
    batch.set(budgetRef, {
      ...parsed.data,
      createdAt: Timestamp.fromDate(now),
      members: {
        [userId]: {
          ...parsed.data.members[userId],
          joinedAt: Timestamp.fromDate(now),
        },
      },
    });

    // 2. Seed default categories
    const categoryIdMap = new Map<string, string>();
    for (const cat of DEFAULT_CATEGORIES) {
      const catRef = doc(collection(db, `budgets/${budgetId}/categories`));
      categoryIdMap.set(cat.name, catRef.id);
      batch.set(catRef, {
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        parentCategoryId: null,
        sortOrder: cat.sortOrder,
        isActive: true,
      });
    }

    // 3. Seed default items
    for (const item of DEFAULT_ITEMS) {
      const categoryId = categoryIdMap.get(item.categoryName) ?? '';
      const itemRef = doc(collection(db, `budgets/${budgetId}/items`));
      batch.set(itemRef, {
        name: item.name,
        nameLowercase: item.name.toLowerCase(),
        defaultPrice: 0,
        categoryId,
        icon: item.icon,
        isActive: true,
        lastUsedAt: null,
      });
    }

    // 4. Update user's activeBudgetId
    batch.update(doc(db, 'users', userId), { activeBudgetId: budgetId });

    await batch.commit();
    return ok(budgetId);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function getBudget(budgetId: string): Promise<Result<Budget>> {
  try {
    const snapshot = await getDoc(doc(db, 'budgets', budgetId));
    if (!snapshot.exists()) {
      return fail({ code: 'firestore/not-found', message: 'Budget not found.' });
    }
    return ok(firestoreToBudget(snapshot.id, snapshot.data()));
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export function subscribeToBudget(
  budgetId: string,
  callback: (budget: Budget | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(db, 'budgets', budgetId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(firestoreToBudget(snapshot.id, snapshot.data()));
      } else {
        callback(null);
      }
    },
    onError,
  );
}

export async function updateBudget(
  budgetId: string,
  updates: BudgetUpdate,
): Promise<Result<void>> {
  try {
    await updateDoc(doc(db, 'budgets', budgetId), updates as Record<string, unknown>);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function getUserBudgets(userId: string): Promise<Result<Budget[]>> {
  try {
    const q = query(
      collection(db, 'budgets'),
      where('memberIds', 'array-contains', userId),
    );
    const snapshot = await getDocs(q);
    const budgets = snapshot.docs.map((d) => firestoreToBudget(d.id, d.data()));
    return ok(budgets);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}
