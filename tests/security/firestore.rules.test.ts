import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
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

// ── Budget seed helper ─────────────────────────────────────────────────
// alice = admin, bob = member, charlie = non-member
async function seedBudget() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'budgets', 'budget1'), {
      name: 'Test Budget',
      currency: 'EUR',
      createdBy: 'alice',
      memberIds: ['alice', 'bob'],
      members: {
        alice: { role: 'admin', displayName: 'Alice', email: 'alice@test.com' },
        bob: { role: 'member', displayName: 'Bob', email: 'bob@test.com' },
      },
    });
  });
}

describe('budgets/{budgetId}', () => {
  it('allows member to read budget', async () => {
    await seedBudget();
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertSucceeds(getDoc(doc(db, 'budgets', 'budget1')));
  });

  it('denies non-member from reading budget', async () => {
    await seedBudget();
    const charlie = testEnv.authenticatedContext('charlie');
    const db = charlie.firestore();

    await assertFails(getDoc(doc(db, 'budgets', 'budget1')));
  });

  it('denies unauthenticated user from reading budget', async () => {
    await seedBudget();
    const unauth = testEnv.unauthenticatedContext();
    const db = unauth.firestore();

    await assertFails(getDoc(doc(db, 'budgets', 'budget1')));
  });

  it('allows any authenticated user to create a budget', async () => {
    const charlie = testEnv.authenticatedContext('charlie');
    const db = charlie.firestore();

    await assertSucceeds(
      setDoc(doc(db, 'budgets', 'newBudget'), {
        name: 'Charlie Budget',
        currency: 'BGN',
        createdBy: 'charlie',
        memberIds: ['charlie'],
        members: {
          charlie: { role: 'admin', displayName: 'Charlie', email: 'charlie@test.com' },
        },
      }),
    );
  });

  it('allows admin to update budget', async () => {
    await seedBudget();
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      updateDoc(doc(db, 'budgets', 'budget1'), { name: 'Updated Budget' }),
    );
  });

  it('denies member (non-admin) from updating budget', async () => {
    await seedBudget();
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertFails(
      updateDoc(doc(db, 'budgets', 'budget1'), { name: 'Hacked Budget' }),
    );
  });

  it('allows admin to delete budget', async () => {
    await seedBudget();
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(deleteDoc(doc(db, 'budgets', 'budget1')));
  });

  it('denies non-member from deleting budget', async () => {
    await seedBudget();
    const charlie = testEnv.authenticatedContext('charlie');
    const db = charlie.firestore();

    await assertFails(deleteDoc(doc(db, 'budgets', 'budget1')));
  });
});

describe('budgets/{budgetId}/fixedCosts/{costId}', () => {
  it('allows member to read fixed costs', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'fixedCosts', 'cost1'), {
        name: 'Rent',
        amount: 80000,
      });
    });

    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertSucceeds(
      getDoc(doc(db, 'budgets', 'budget1', 'fixedCosts', 'cost1')),
    );
  });

  it('denies non-member from reading fixed costs', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'fixedCosts', 'cost1'), {
        name: 'Rent',
        amount: 80000,
      });
    });

    const charlie = testEnv.authenticatedContext('charlie');
    const db = charlie.firestore();

    await assertFails(
      getDoc(doc(db, 'budgets', 'budget1', 'fixedCosts', 'cost1')),
    );
  });

  it('allows admin to create fixed cost', async () => {
    await seedBudget();
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      addDoc(collection(db, 'budgets', 'budget1', 'fixedCosts'), {
        name: 'Internet',
        amount: 3500,
      }),
    );
  });

  it('denies member (non-admin) from creating fixed cost', async () => {
    await seedBudget();
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertFails(
      addDoc(collection(db, 'budgets', 'budget1', 'fixedCosts'), {
        name: 'Internet',
        amount: 3500,
      }),
    );
  });

  it('allows admin to delete fixed cost', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'fixedCosts', 'cost1'), {
        name: 'Rent',
        amount: 80000,
      });
    });

    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      deleteDoc(doc(db, 'budgets', 'budget1', 'fixedCosts', 'cost1')),
    );
  });
});

describe('budgets/{budgetId}/yearlyGoals/{goalId}', () => {
  it('allows member to read yearly goals', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'yearlyGoals', 'goal1'), {
        name: 'Vacation',
        targetAmount: 240000,
      });
    });

    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertSucceeds(
      getDoc(doc(db, 'budgets', 'budget1', 'yearlyGoals', 'goal1')),
    );
  });

  it('allows admin to create yearly goal', async () => {
    await seedBudget();
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      addDoc(collection(db, 'budgets', 'budget1', 'yearlyGoals'), {
        name: 'Emergency Fund',
        targetAmount: 600000,
      }),
    );
  });

  it('denies non-member from reading yearly goals', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'yearlyGoals', 'goal1'), {
        name: 'Vacation',
        targetAmount: 240000,
      });
    });

    const charlie = testEnv.authenticatedContext('charlie');
    const db = charlie.firestore();

    await assertFails(
      getDoc(doc(db, 'budgets', 'budget1', 'yearlyGoals', 'goal1')),
    );
  });
});

describe('budgets/{budgetId}/categories/{categoryId}', () => {
  it('allows member to read categories', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'categories', 'cat1'), {
        name: 'Groceries',
        icon: 'cart',
      });
    });

    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertSucceeds(
      getDoc(doc(db, 'budgets', 'budget1', 'categories', 'cat1')),
    );
  });

  it('allows admin to write categories', async () => {
    await seedBudget();
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      setDoc(doc(db, 'budgets', 'budget1', 'categories', 'cat1'), {
        name: 'Groceries',
        icon: 'cart',
      }),
    );
  });

  it('denies non-member from reading categories', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'categories', 'cat1'), {
        name: 'Groceries',
        icon: 'cart',
      });
    });

    const charlie = testEnv.authenticatedContext('charlie');
    const db = charlie.firestore();

    await assertFails(
      getDoc(doc(db, 'budgets', 'budget1', 'categories', 'cat1')),
    );
  });
});

describe('budgets/{budgetId}/months/{monthId}', () => {
  it('allows member to read month', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'months', '2026-03'), {
        income: 500000,
        totalFixedCosts: 120000,
        totalYearlyGoals: 20000,
      });
    });

    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertSucceeds(
      getDoc(doc(db, 'budgets', 'budget1', 'months', '2026-03')),
    );
  });

  it('allows admin to create month', async () => {
    await seedBudget();
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      setDoc(doc(db, 'budgets', 'budget1', 'months', '2026-04'), {
        income: 500000,
        totalFixedCosts: 120000,
        totalYearlyGoals: 20000,
      }),
    );
  });

  it('allows admin to update month', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'months', '2026-03'), {
        income: 500000,
        totalFixedCosts: 120000,
        totalYearlyGoals: 20000,
      });
    });

    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      updateDoc(doc(db, 'budgets', 'budget1', 'months', '2026-03'), {
        income: 550000,
      }),
    );
  });

  it('denies non-member from reading month', async () => {
    await seedBudget();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'budgets', 'budget1', 'months', '2026-03'), {
        income: 500000,
        totalFixedCosts: 120000,
        totalYearlyGoals: 20000,
      });
    });

    const charlie = testEnv.authenticatedContext('charlie');
    const db = charlie.firestore();

    await assertFails(
      getDoc(doc(db, 'budgets', 'budget1', 'months', '2026-03')),
    );
  });

  it('denies member (non-admin) from creating month', async () => {
    await seedBudget();
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertFails(
      setDoc(doc(db, 'budgets', 'budget1', 'months', '2026-04'), {
        income: 500000,
        totalFixedCosts: 120000,
        totalYearlyGoals: 20000,
      }),
    );
  });
});
