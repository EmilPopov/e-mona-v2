import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError, mapZodError } from '@/types/errors';
import { UserCreateSchema, UserUpdateSchema } from '@/types/schemas';
import type { User, UserCreate, UserUpdate } from '@/types/types';

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function firestoreToUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    email: data.email as string,
    displayName: data.displayName as string,
    avatarColor: data.avatarColor as string,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt as Date,
    activeBudgetId: (data.activeBudgetId as string) ?? null,
    currency: data.currency as User['currency'],
    fcmTokens: (data.fcmTokens as string[]) ?? [],
    notificationPrefs: data.notificationPrefs as User['notificationPrefs'],
  };
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<Result<User>> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const userData: UserCreate = {
      email,
      displayName,
      avatarColor: randomAvatarColor(),
      createdAt: new Date(),
      activeBudgetId: null,
      currency: 'EUR',
      fcmTokens: [],
      notificationPrefs: {
        dailyReminder: true,
        budgetAlerts: true,
        reminderTime: '20:00',
      },
    };

    const parsed = UserCreateSchema.safeParse(userData);
    if (!parsed.success) {
      return fail(mapZodError(parsed.error));
    }

    await setDoc(doc(db, 'users', uid), {
      ...parsed.data,
      createdAt: Timestamp.fromDate(parsed.data.createdAt),
    });

    return ok({ id: uid, ...parsed.data });
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function login(
  email: string,
  password: string,
): Promise<Result<FirebaseUser>> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return ok(credential.user);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function logout(): Promise<Result<void>> {
  try {
    await signOut(auth);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function resetPassword(email: string): Promise<Result<void>> {
  try {
    await sendPasswordResetEmail(auth, email);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function getUserProfile(uid: string): Promise<Result<User>> {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) {
      return fail({ code: 'firestore/not-found', message: 'User profile not found.' });
    }
    return ok(firestoreToUser(snapshot.id, snapshot.data()));
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function updateUserProfile(
  uid: string,
  data: UserUpdate,
): Promise<Result<void>> {
  try {
    const parsed = UserUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return fail(mapZodError(parsed.error));
    }
    await updateDoc(doc(db, 'users', uid), parsed.data as Record<string, unknown>);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<Result<void>> {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return fail({ code: 'auth/requires-recent-login', message: 'Please log in again.' });
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return ok(undefined);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

export function onAuthChange(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}

export function subscribeToUserProfile(
  uid: string,
  callback: (user: User | null) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(firestoreToUser(snapshot.id, snapshot.data()));
      } else {
        callback(null);
      }
    },
  );
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}
