# Phase 1: Authentication & User System

**Duration:** Days 3–6
**Goal:** Users can register, login, logout, and reset password. User profile stored in Firestore. Auth state persists across app restarts.

---

## Firestore Schema for This Phase

```
users/{userId}
  ├── email: string
  ├── displayName: string
  ├── avatarColor: string          # Random color assigned at registration
  ├── createdAt: Timestamp
  ├── activeBudgetId: string | null
  ├── currency: string             # "EUR" (default), "USD", "GBP"
  ├── fcmTokens: string[]          # Empty for now, used in Phase 7
  └── notificationPrefs: {
        dailyReminder: boolean     # default true
        budgetAlerts: boolean      # default true
        reminderTime: string       # "20:00"
      }
```

---

## Tasks

### Task 1.1: Zod Schemas & TypeScript Types
**What:** Define all types using Zod schemas as the single source of truth. TypeScript types are inferred from Zod — never manually written. This ensures runtime validation and TypeScript types are always in sync.

**Why Zod-first?** This is a proven pattern from the v1 project. Define the schema once, derive Create/Update variants via `.omit()`, and infer TypeScript types via `z.infer<>`. Every Firestore write must pass `.safeParse()` before being sent — this catches bugs at runtime, not just in the IDE.

**Skills needed:** Zod schema API, TypeScript inference
**AI strengths:** Generate all Zod schemas from the Firestore schema accurately. AI can ensure schemas are consistent and produce correct Create/Update variants. This is one of the highest-value AI tasks — getting schemas right saves hours of debugging.
**Human strengths:** Review the schemas to make sure they match your mental model of the data. If something feels wrong, it probably is.
**Best collaboration:** AI generates all schemas in one go. You read through them and ask "why?" for anything unclear.

**Files to create:**
- `src/types/schemas.ts` — All Zod schemas (User, Budget, BudgetMonth, Purchase, Item, Category, FixedCost, YearlyGoal, Invitation) with Create/Update variants
- `src/types/types.ts` — All TypeScript types inferred from schemas via `z.infer<>`
- `src/types/enums.ts` — CurrencyCode, UserRole, MonthStatus, GoalFrequency

**Key pattern:**
```typescript
// src/types/schemas.ts — Zod schemas (single source of truth)
import { z } from 'zod';

// Currency stored as integers (cents): €12.50 → 1250
export const CurrencyCode = z.enum(['EUR', 'USD', 'GBP']);
export const UserRole = z.enum(['admin', 'member']);
export const MonthStatus = z.enum(['draft', 'active', 'closed']);

export const User = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(2),
  avatarColor: z.string(),
  createdAt: z.date(),
  activeBudgetId: z.string().nullable(),
  currency: CurrencyCode,
  fcmTokens: z.array(z.string()),
  notificationPrefs: NotificationPrefs,
}).strict();

export const UserCreate = User.omit({ id: true });
export const UserUpdate = User.omit({ id: true, createdAt: true }).partial();

// src/types/types.ts — inferred types (never manually written)
import * as schemas from './schemas';
export type User = z.infer<typeof schemas.User>;
export type UserCreate = z.infer<typeof schemas.UserCreate>;
```

**Validation before every Firestore write:**
```typescript
const result = schemas.UserCreate.safeParse(userData);
if (!result.success) {
  return { success: false, error: mapZodError(result.error) };
}
await setDoc(docRef, result.data);
```

**Verification:**
- [ ] No TypeScript errors in the project
- [ ] All schemas match the Firestore schema documented in phase files
- [ ] Create/Update variants correctly omit id and timestamps
- [ ] `.safeParse()` catches invalid data at runtime

---

### Task 1.2: Auth Service
**What:** Wrapper around Firebase Auth SDK. Pure functions, no reactive state.

**Skills needed:** Firebase Auth v10 modular API, async/await, error handling
**AI strengths:** Firebase Auth has many subtle gotchas (error codes, persistence modes, emulator connection). AI can generate a battle-tested service that handles all edge cases.
**Human strengths:** Understanding the flow conceptually — "register creates a Firebase user AND a Firestore document"
**Best collaboration:** AI writes the service with comments explaining each function. You trace through the register flow mentally to understand it.

**File:** `src/services/auth.service.ts`

**Functions:**
- `register(email, password, displayName)` → Creates Firebase Auth user + Firestore user doc
- `login(email, password)` → Signs in, returns user
- `logout()` → Signs out
- `resetPassword(email)` → Sends reset email
- `onAuthChange(callback)` → Wraps `onAuthStateChanged`
- `getCurrentUser()` → Returns current Firebase Auth user

**Important detail:** `register()` must do TWO things:
1. `createUserWithEmailAndPassword()` — creates the auth account
2. `setDoc(doc(db, 'users', uid), {...})` — creates the Firestore profile

If step 2 fails, the user has an auth account but no profile. The service should handle this gracefully.

**Verification:**
- [ ] Register creates user in Auth emulator AND Firestore emulator
- [ ] Login works with registered credentials
- [ ] Logout clears the session
- [ ] Reset password sends email (check emulator logs)

---

### Task 1.3: Auth Store (Pinia)
**What:** Reactive auth state. Listens to Firebase auth changes, loads user profile.

**Skills needed:** Pinia setup syntax, Vue 3 reactivity, Firebase real-time listeners
**AI strengths:** Pinia setup syntax with TypeScript is tricky for beginners. AI can generate the store with correct typing, proper subscription cleanup, and computed properties.
**Human strengths:** Understanding *when* the store updates (auth state changes → profile loads → app renders)
**Best collaboration:** AI writes the store. You add `console.log` statements to trace the auth flow and understand the sequence.

**File:** `src/stores/auth.store.ts`

**State:**
- `user: User | null`
- `firebaseUser: FirebaseUser | null`
- `isAuthenticated: boolean` (computed)
- `loading: boolean`
- `initialized: boolean` — important! The app must wait for Firebase to check existing session before rendering

**Actions:**
- `init()` — called once in App.vue, sets up `onAuthStateChanged`
- `login(email, password)`
- `register(email, password, displayName)`
- `logout()`

**Critical pattern — waiting for auth initialization:**
```typescript
// In App.vue, don't render the app until auth is checked
const authStore = useAuthStore();
const ready = computed(() => authStore.initialized);
// <template>: <ion-app v-if="ready">...</ion-app>
```

**Verification:**
- [ ] App shows loading state until Firebase auth check completes
- [ ] After login, `authStore.user` is populated
- [ ] After logout, `authStore.user` is null
- [ ] Refreshing the page keeps you logged in (persistence works)

---

### Task 1.4: Auth Composable
**What:** UI-facing logic for login/register forms. Handles validation, loading, error messages.

**Skills needed:** Vue 3 Composition API, form validation patterns
**AI strengths:** Boilerplate form logic (validation rules, loading states, error mapping from Firebase codes to user-friendly messages)
**Human strengths:** Deciding what validation messages to show, UX feel
**Best collaboration:** AI generates the composable. You test the form and adjust error messages.

**File:** `src/composables/useAuth.ts`

**Exposes:**
- `loginForm` (reactive: email, password)
- `registerForm` (reactive: email, password, confirmPassword, displayName)
- `handleLogin()` — validates, calls store, navigates on success
- `handleRegister()` — validates, calls store, navigates
- `handleResetPassword()`
- `loginError`, `registerError` — user-friendly error strings
- `isLoading`

**Firebase error code → message mapping:**
```
auth/user-not-found       → "No account with this email"
auth/wrong-password       → "Incorrect password"
auth/email-already-in-use → "An account with this email already exists"
auth/weak-password        → "Password must be at least 6 characters"
```

**Verification:**
- [ ] Empty email shows validation error
- [ ] Wrong password shows "Incorrect password"
- [ ] Successful login navigates to home

---

### Task 1.5: Auth Views (Login, Register, Forgot Password)
**What:** Three Ionic pages for authentication.

**Skills needed:** Ionic Vue components (ion-page, ion-input, ion-button), CSS
**AI strengths:** Generate complete Ionic page components with proper structure. AI knows the Ionic component API well.
**Human strengths:** Visual design decisions — spacing, colors, logo placement. This is where your creative vision matters most. The login screen is the first impression.
**Best collaboration:** AI generates functional pages. You tweak the visual design. Iterate: "make the button bigger", "add more spacing", etc.

**Files:**
- `src/views/auth/LoginPage.vue`
- `src/views/auth/RegisterPage.vue`
- `src/views/auth/ForgotPasswordPage.vue`

**Login Page layout:**
```
┌───────────────────────────┐
│                           │
│        🪙 e-mona          │
│   "Smart family budget"   │
│                           │
│  Email:                   │
│  [________________]       │
│                           │
│  Password:                │
│  [________________]       │
│                           │
│  [    Log in     ]        │
│                           │
│  Forgot password?         │
│  Don't have an account?   │
│  Create one →             │
└───────────────────────────┘
```

**Colorful & playful style notes:**
- Gradient or colored header area with app logo
- Rounded input fields
- Primary button with shadow
- Friendly, warm color palette

**Verification:**
- [ ] Login page renders correctly
- [ ] Register page has all fields (name, email, password, confirm)
- [ ] Forgot password sends reset email
- [ ] Navigation between auth pages works

---

### Task 1.6: Router & Navigation Guards
**What:** Route definitions and auth protection.

**Skills needed:** Vue Router, Ionic router integration, navigation guards
**AI strengths:** Navigation guards with Firebase auth have a subtle timing issue — you must wait for `onAuthStateChanged` before deciding to redirect. AI knows this pattern.
**Human strengths:** Deciding the redirect flow (login → where? register → where?)
**Best collaboration:** AI writes the router with guards. You test by trying to access protected routes while logged out.

**File:** `src/router/index.ts`

**Routes:**
```
/login              → LoginPage (guest only)
/register           → RegisterPage (guest only)
/forgot-password    → ForgotPasswordPage (guest only)
/tabs/home          → Dashboard (auth required)
/tabs/purchases     → PurchasesList (auth required)
/tabs/analytics     → Analytics (auth required)
/tabs/more          → MoreMenu (auth required)
/budget/setup       → BudgetSetup (auth required, no budget yet)
```

**Guard logic:**
1. Wait for `authStore.initialized` (Firebase checked session)
2. If route requires auth and user is not logged in → redirect to `/login`
3. If route is guest-only and user IS logged in → redirect to `/tabs/home`
4. After login: if user has `activeBudgetId` → `/tabs/home`, else → `/budget/setup`

**Verification:**
- [ ] Unauthenticated user can't access /tabs/* routes
- [ ] Authenticated user is redirected away from /login
- [ ] New user (no budget) is sent to /budget/setup after login
- [ ] Existing user (has budget) goes straight to home

---

### Task 1.7: Basic Firestore Security Rules
**What:** Lock down Firestore so only authenticated users can read/write their own data.

**Skills needed:** Firestore security rules syntax
**AI strengths:** Security rules are error-prone and hard to test mentally. AI can generate rules that cover all edge cases and follow Firebase best practices.
**Human strengths:** Testing the rules with the emulator to make sure they actually work
**Best collaboration:** AI writes rules with comments. You test in the emulator UI.

**File:** `firestore.rules`

**Rules for this phase:**
```
users/{userId}:
  - read/write: only if request.auth.uid == userId
```

(Budget rules will be added in Phase 2)

**Important:** Install `@firebase/rules-unit-testing` and write automated security rules tests from the start — don't rely on manual emulator UI testing. This prevents the subtle bugs (like operator precedence issues) that plagued the v1 security rules.

```bash
npm install -D @firebase/rules-unit-testing
```

**File:** `tests/security/firestore.rules.test.ts`

**Test cases for this phase:**
```
✅ Authenticated user can read own profile
❌ Authenticated user cannot read other user's profile
❌ Unauthenticated user cannot read anything
✅ User can update own profile
❌ User cannot update other user's profile
```

**Verification:**
- [ ] Authenticated user can read their own profile
- [ ] Authenticated user CANNOT read other users' profiles
- [ ] Unauthenticated requests are denied
- [ ] Automated security rules tests pass against emulator
- [ ] Test in Firebase emulator UI

---

### Task 1.8: Profile & Settings Page
**What:** User can view and edit their profile, change password, and log out. Accessible from the "More" tab.

**File:** `src/views/settings/ProfileSettings.vue`

**Route:** `/tabs/more/profile`

**Screen:**
```
┌───────────────────────────────┐
│  👤 Profile                   │
│───────────────────────────────│
│                               │
│       [E]                     │  ← avatar circle (initials + color)
│      Emil P.                  │
│  e.popov@email.com            │
│                               │
│  Display Name     [Emil P. ✏️]│
│  Avatar Color     [🟣 ✏️]     │
│                               │
│  ─────────────────────────    │
│  Change Password  [→]         │
│  ─────────────────────────    │
│  Currency         [EUR ▼]     │
│  ─────────────────────────    │
│                               │
│  [🚪 Log Out]                 │
│                               │
└───────────────────────────────┘
```

**Features:**
- Edit displayName → updates Firestore user doc
- Change avatar color → color picker (10 preset colors)
- Change password → Firebase `updatePassword()` (requires reauthentication)
- Currency preference → updates user doc (used by `useCurrency` composable)
- Logout → clears auth state, navigates to login

**Verification:**
- [ ] Display name updates and reflects across the app
- [ ] Avatar color changes immediately
- [ ] Change password requires current password first
- [ ] Logout clears session and redirects to login
- [ ] Currency change takes effect on all screens

---

## Phase 1 Complete Checklist
- [ ] Zod schemas and inferred types defined in `src/types/`
- [ ] All Firestore writes validated with `.safeParse()` before sending
- [ ] Auth service handles register, login, logout, reset — returns `Result<T>`
- [ ] Auth store manages reactive auth state
- [ ] Auth composable handles form validation + error messages
- [ ] Login, Register, Forgot Password pages work
- [ ] Router guards protect routes
- [ ] Security rules deployed to emulator
- [ ] Automated security rules tests pass
- [ ] Session persists across app refresh
- [ ] Clean error handling (no raw Firebase errors shown to user)
- [ ] Profile page: edit name, avatar, password, logout
