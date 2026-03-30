import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  type QueryConstraint,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotMetadata,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';

type WithDates<T> = {
  [K in keyof T]: T[K] extends Date ? Timestamp : T[K];
};

function convertTimestamps<T extends DocumentData>(data: DocumentData): T {
  const converted: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      converted[key] = value.toDate();
    } else {
      converted[key] = value;
    }
  }
  return converted as T;
}

function convertDatesToTimestamps<T extends DocumentData>(data: Partial<T>): DocumentData {
  const converted: DocumentData = {};
  for (const [key, value] of Object.entries(data as DocumentData)) {
    if (value instanceof Date) {
      converted[key] = Timestamp.fromDate(value);
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

export interface EntityWithId {
  id: string;
}

export abstract class FirestoreService<T extends EntityWithId> {
  protected abstract readonly collectionPath: string;

  private get collectionRef() {
    return collection(db, this.collectionPath);
  }

  private get converter(): FirestoreDataConverter<T> {
    return {
      toFirestore: (item: T): DocumentData => {
        const { id, ...data } = item as DocumentData & { id: string };
        return convertDatesToTimestamps(data);
      },
      fromFirestore: (snapshot: QueryDocumentSnapshot): T => {
        const data = snapshot.data();
        return {
          ...convertTimestamps<T>(data),
          id: snapshot.id,
        } as T;
      },
    };
  }

  async create(data: Omit<T, 'id'>): Promise<Result<string>> {
    try {
      const docData = convertDatesToTimestamps(data as DocumentData);
      const docRef = await addDoc(this.collectionRef, docData);
      return ok(docRef.id);
    } catch (error: unknown) {
      return fail(mapFirebaseError(error));
    }
  }

  async getById(id: string): Promise<Result<T>> {
    try {
      const docRef = doc(db, this.collectionPath, id).withConverter(this.converter);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return fail({
          code: 'firestore/not-found',
          message: 'Document not found.',
        });
      }
      return ok(snapshot.data());
    } catch (error: unknown) {
      return fail(mapFirebaseError(error));
    }
  }

  async getAll(...constraints: QueryConstraint[]): Promise<Result<T[]>> {
    try {
      const q = query(this.collectionRef, ...constraints).withConverter(this.converter);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((d) => d.data());
      return ok(items);
    } catch (error: unknown) {
      return fail(mapFirebaseError(error));
    }
  }

  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<Result<void>> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      const docData = convertDatesToTimestamps(data as DocumentData);
      await updateDoc(docRef, docData);
      return ok(undefined);
    } catch (error: unknown) {
      return fail(mapFirebaseError(error));
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await deleteDoc(docRef);
      return ok(undefined);
    } catch (error: unknown) {
      return fail(mapFirebaseError(error));
    }
  }

  subscribe(
    callback: (items: T[]) => void,
    onError?: (error: unknown) => void,
    ...constraints: QueryConstraint[]
  ): () => void {
    const q = query(this.collectionRef, ...constraints).withConverter(this.converter);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data());
        callback(items);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
      },
    );
    return unsubscribe;
  }

  subscribeToDoc(
    id: string,
    callback: (item: T | null) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    const docRef = doc(db, this.collectionPath, id).withConverter(this.converter);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        callback(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        if (onError) {
          onError(error);
        }
      },
    );
    return unsubscribe;
  }
}
