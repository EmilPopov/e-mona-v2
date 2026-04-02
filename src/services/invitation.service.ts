import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  runTransaction,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';
import { mapFirebaseError } from '@/types/errors';
import type { Invitation } from '@/types/types';

const INVITE_EXPIRY_HOURS = 24;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I confusion
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function firestoreToInvitation(id: string, data: Record<string, unknown>): Invitation {
  return {
    id,
    code: data.code as string,
    budgetId: data.budgetId as string,
    budgetName: data.budgetName as string,
    role: (data.role as Invitation['role']) ?? 'member',
    createdBy: data.createdBy as string,
    createdByName: data.createdByName as string,
    status: data.status as Invitation['status'],
    usedBy: (data.usedBy as string) ?? null,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : data.createdAt as Date,
    expiresAt: data.expiresAt instanceof Timestamp
      ? data.expiresAt.toDate()
      : data.expiresAt as Date,
  };
}

/**
 * Creates an invitation with a unique 6-digit code.
 * Retries up to 3 times if a code collision occurs.
 */
export async function createInvitation(
  budgetId: string,
  budgetName: string,
  adminUserId: string,
  adminName: string,
): Promise<Result<Invitation>> {
  try {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = generateCode();

      // Check for collision
      const existing = await getDocs(
        query(collection(db, 'invitations'), where('code', '==', code), where('status', '==', 'active')),
      );
      if (!existing.empty) continue;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

      const invRef = doc(collection(db, 'invitations'));
      const invitation: Omit<Invitation, 'id'> = {
        code,
        budgetId,
        budgetName,
        role: 'member',
        createdBy: adminUserId,
        createdByName: adminName,
        status: 'active',
        usedBy: null,
        createdAt: now,
        expiresAt,
      };

      await setDoc(invRef, {
        ...invitation,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
      });

      return ok({ id: invRef.id, ...invitation });
    }

    return fail({ code: 'invitation/code-collision', message: 'Failed to generate unique code. Try again.' });
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Validates an invite code. Returns the invitation if valid.
 */
export async function validateCode(code: string): Promise<Result<Invitation>> {
  try {
    const upperCode = code.toUpperCase().trim();
    const snapshot = await getDocs(
      query(collection(db, 'invitations'), where('code', '==', upperCode)),
    );

    if (snapshot.empty) {
      return fail({ code: 'invitation/not-found', message: 'Invalid invite code.' });
    }

    const docSnap = snapshot.docs[0];
    const invitation = firestoreToInvitation(docSnap.id, docSnap.data());

    if (invitation.status === 'used') {
      return fail({ code: 'invitation/already-used', message: 'This code has already been used.' });
    }

    if (invitation.expiresAt < new Date()) {
      return fail({ code: 'invitation/expired', message: 'This invite code has expired.' });
    }

    if (invitation.status !== 'active') {
      return fail({ code: 'invitation/invalid', message: 'This invite code is no longer valid.' });
    }

    return ok(invitation);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Redeems an invite code using a Firestore transaction:
 * 1. Validate code is still active and not expired
 * 2. Add user to budget.memberIds and budget.members
 * 3. Update user's activeBudgetId
 * 4. Mark invitation as "used"
 */
export async function redeemCode(
  code: string,
  userId: string,
  displayName: string,
  email: string,
): Promise<Result<string>> {
  try {
    const upperCode = code.toUpperCase().trim();

    // Find the invitation first
    const snapshot = await getDocs(
      query(collection(db, 'invitations'), where('code', '==', upperCode)),
    );

    if (snapshot.empty) {
      return fail({ code: 'invitation/not-found', message: 'Invalid invite code.' });
    }

    const invDoc = snapshot.docs[0];
    const invRef = doc(db, 'invitations', invDoc.id);
    const invData = invDoc.data();
    const budgetId = invData.budgetId as string;

    const budgetRef = doc(db, 'budgets', budgetId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
      const invSnap = await transaction.get(invRef);
      if (!invSnap.exists()) {
        throw Object.assign(new Error('Invitation not found.'), { appCode: 'invitation/not-found' });
      }

      const inv = invSnap.data();
      if (inv.status !== 'active') {
        throw Object.assign(new Error('This code is no longer active.'), { appCode: 'invitation/inactive' });
      }
      if ((inv.expiresAt as Timestamp).toDate() < new Date()) {
        throw Object.assign(new Error('This invite code has expired.'), { appCode: 'invitation/expired' });
      }

      const budgetSnap = await transaction.get(budgetRef);
      if (!budgetSnap.exists()) {
        throw Object.assign(new Error('Budget not found.'), { appCode: 'invitation/budget-not-found' });
      }

      const budgetData = budgetSnap.data();
      const memberIds = budgetData.memberIds as string[];
      if (memberIds.includes(userId)) {
        throw Object.assign(new Error('You are already a member of this budget.'), { appCode: 'invitation/already-member' });
      }

      const now = new Date();
      const role = (inv.role as string) || 'member';

      // 1. Mark invitation as used
      transaction.update(invRef, {
        status: 'used',
        usedBy: userId,
      });

      // 2. Add user to budget
      transaction.update(budgetRef, {
        memberIds: arrayUnion(userId),
        [`members.${userId}`]: {
          role,
          displayName,
          email,
          joinedAt: Timestamp.fromDate(now),
        },
      });

      // 3. Set user's active budget
      transaction.update(userRef, {
        activeBudgetId: budgetId,
      });
    });

    return ok(budgetId);
  } catch (error: unknown) {
    if (error instanceof Error) {
      const code = (error as Error & { appCode?: string }).appCode ?? 'invitation/redeem-failed';
      return fail({ code, message: error.message });
    }
    return fail(mapFirebaseError(error));
  }
}

/**
 * Gets all active invitations for a budget (admin view).
 */
export async function getActiveInvitations(budgetId: string): Promise<Result<Invitation[]>> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'invitations'),
        where('budgetId', '==', budgetId),
        where('status', '==', 'active'),
      ),
    );

    const invitations = snapshot.docs.map((d) =>
      firestoreToInvitation(d.id, d.data()),
    );

    return ok(invitations);
  } catch (error: unknown) {
    return fail(mapFirebaseError(error));
  }
}

/**
 * Removes a member from a budget.
 * Updates budget.memberIds and budget.members, and clears the user's activeBudgetId.
 */
export async function removeMember(
  budgetId: string,
  memberUserId: string,
): Promise<Result<void>> {
  try {
    const budgetRef = doc(db, 'budgets', budgetId);
    const userRef = doc(db, 'users', memberUserId);

    await runTransaction(db, async (transaction) => {
      const budgetSnap = await transaction.get(budgetRef);
      if (!budgetSnap.exists()) {
        throw Object.assign(new Error('Budget not found.'), { appCode: 'members/budget-not-found' });
      }

      const data = budgetSnap.data();
      const memberIds = (data.memberIds as string[]).filter((id) => id !== memberUserId);
      const members = { ...data.members } as Record<string, unknown>;
      delete members[memberUserId];

      transaction.update(budgetRef, { memberIds, members });
      transaction.update(userRef, { activeBudgetId: null });
    });

    return ok(undefined);
  } catch (error: unknown) {
    if (error instanceof Error) {
      const code = (error as Error & { appCode?: string }).appCode ?? 'members/remove-failed';
      return fail({ code, message: error.message });
    }
    return fail(mapFirebaseError(error));
  }
}
