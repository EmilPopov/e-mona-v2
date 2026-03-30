import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'e-mona-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('users/{userId}', () => {
  it('allows authenticated user to read own profile', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    // Seed data
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users', 'alice'), {
        email: 'alice@test.com',
        displayName: 'Alice',
      });
    });

    await assertSucceeds(getDoc(doc(db, 'users', 'alice')));
  });

  it('denies authenticated user from reading another user profile', async () => {
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users', 'alice'), {
        email: 'alice@test.com',
        displayName: 'Alice',
      });
    });

    await assertFails(getDoc(doc(db, 'users', 'alice')));
  });

  it('denies unauthenticated user from reading any profile', async () => {
    const unauth = testEnv.unauthenticatedContext();
    const db = unauth.firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users', 'alice'), {
        email: 'alice@test.com',
        displayName: 'Alice',
      });
    });

    await assertFails(getDoc(doc(db, 'users', 'alice')));
  });

  it('allows user to update own profile', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users', 'alice'), {
        email: 'alice@test.com',
        displayName: 'Alice',
      });
    });

    await assertSucceeds(
      updateDoc(doc(db, 'users', 'alice'), { displayName: 'Alice Updated' }),
    );
  });

  it('denies user from updating another user profile', async () => {
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'users', 'alice'), {
        email: 'alice@test.com',
        displayName: 'Alice',
      });
    });

    await assertFails(
      updateDoc(doc(db, 'users', 'alice'), { displayName: 'Hacked' }),
    );
  });

  it('allows user to create own profile', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      setDoc(doc(db, 'users', 'alice'), {
        email: 'alice@test.com',
        displayName: 'Alice',
      }),
    );
  });

  it('denies user from creating another user profile', async () => {
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertFails(
      setDoc(doc(db, 'users', 'alice'), {
        email: 'alice@test.com',
        displayName: 'Alice',
      }),
    );
  });
});
