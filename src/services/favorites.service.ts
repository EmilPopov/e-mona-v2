import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError, mapZodError } from '@/types/errors';
import { FavoriteCreateSchema } from '@/types/schemas';
import type { Favorite, FavoriteCreate, CatalogItem, Category } from '@/types/types';

function collectionRef(userId: string) {
  return collection(db, `users/${userId}/favorites`);
}

function firestoreToFavorite(id: string, data: Record<string, unknown>): Favorite {
  return {
    id,
    itemName: data.itemName as string,
    defaultPrice: data.defaultPrice as number,
    categoryId: data.categoryId as string,
    categoryName: data.categoryName as string,
    categoryColor: data.categoryColor as string,
    icon: data.icon as string,
    sortOrder: data.sortOrder as number,
    addedAt: data.addedAt instanceof Timestamp
      ? data.addedAt.toDate()
      : data.addedAt as Date,
  };
}

export function subscribeFavorites(
  userId: string,
  callback: (favorites: Favorite[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const q = query(collectionRef(userId), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const favorites = snapshot.docs.map((d) =>
        firestoreToFavorite(d.id, d.data()),
      );
      callback(favorites);
    },
    onError,
  );
}

export async function addFavorite(
  userId: string,
  data: FavoriteCreate,
): Promise<Result<string>> {
  try {
    const parsed = FavoriteCreateSchema.safeParse(data);
    if (!parsed.success) {
      return fail(mapZodError(parsed.error));
    }

    const docRef = await addDoc(collectionRef(userId), {
      ...parsed.data,
      addedAt: Timestamp.fromDate(parsed.data.addedAt),
    });
    return ok(docRef.id);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function removeFavorite(
  userId: string,
  favoriteId: string,
): Promise<Result<void>> {
  try {
    await deleteDoc(doc(db, `users/${userId}/favorites`, favoriteId));
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function reorderFavorites(
  userId: string,
  orderedIds: string[],
): Promise<Result<void>> {
  try {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      const docRef = doc(db, `users/${userId}/favorites`, id);
      batch.update(docRef, { sortOrder: index });
    });
    await batch.commit();
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Convenience helper: builds a FavoriteCreate from a CatalogItem + Category.
 */
export function buildFavoriteFromCatalogItem(
  catalogItem: CatalogItem,
  category: Category,
  sortOrder: number,
): FavoriteCreate {
  return {
    itemName: catalogItem.name,
    defaultPrice: catalogItem.defaultPrice,
    categoryId: catalogItem.categoryId,
    categoryName: category.name,
    categoryColor: category.color,
    icon: catalogItem.icon || 'bag-handle-outline',
    sortOrder,
    addedAt: new Date(),
  };
}
