# Phase 0: Project Setup & Dev Environment

**Duration:** Days 1–2
**Goal:** Working Ionic + Vue 3 + Firebase development environment with emulators running.

---

## Tasks

### Task 0.1: Create Ionic + Vue 3 Project
**What:** Scaffold the app with Ionic CLI, configure TypeScript, Vite, and path aliases.

```bash
npm install -g @ionic/cli
ionic start e-mona tabs --type vue --capacitor
cd e-mona
```

**Skills needed:** CLI tools, npm, basic project configuration
**AI strengths:** Generate all config files (vite.config.ts, tsconfig.json, capacitor.config.ts) correctly on first try. AI knows the exact Ionic + Vue 3 + Capacitor configuration.
**Human strengths:** Verify the app runs in the browser (`ionic serve`). Test on your phone if possible.
**Best collaboration:** AI scaffolds everything, you run it and confirm it works.

**Files to create/modify:**
- `capacitor.config.ts` — appId: `com.emona.app`, appName: `e-mona`
- `vite.config.ts` — path alias `@/` → `src/`
- `tsconfig.json` — strict mode, path aliases
- `.env.example` — template for Firebase config keys
- `.gitignore` — ensure proper ignores

**Verification:**
- [ ] `ionic serve` opens the app in browser
- [ ] No TypeScript errors
- [ ] Path alias `@/` works in imports

---

### Task 0.2: Install Core Dependencies
**What:** Add all libraries needed across the project.

```bash
# Core
npm install firebase pinia @vueuse/core zod

# Ionic/Capacitor plugins
npm install @capacitor/network @capacitor/splash-screen @capacitor/status-bar @capacitor/push-notifications

# Charts (Phase 6, but install now to avoid mid-project config changes)
npm install vue-chartjs chart.js

# Dev
npm install -D @types/node
```

**Skills needed:** Understanding what each package does
**AI strengths:** Knows exactly which packages are compatible with Vue 3 + Ionic 8 + Capacitor 6
**Human strengths:** Decision-making if version conflicts arise
**Best collaboration:** AI provides the exact install command, you run it.

**Verification:**
- [ ] `npm ls` shows no peer dependency warnings
- [ ] App still runs after installing everything

---

### Task 0.3: Firebase Project Setup
**What:** Create Firebase project in console, enable services, configure the app.

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project named "e-mona"
3. Enable **Authentication** → Email/Password method
4. Create **Firestore Database** → Start in test mode (we'll add rules in Phase 1)
5. Copy the Firebase config (apiKey, authDomain, etc.)
6. Create `.env.development` with config values

**Skills needed:** Firebase Console navigation (this is a manual step — AI can't do it for you)
**AI strengths:** Tell you exactly which settings to enable, generate the .env file template
**Human strengths:** YOU must create the Firebase project and copy the config — this requires browser access and your Google account
**Best collaboration:** AI writes the step-by-step guide, you execute in the browser.

**Files to create:**
- `.env.development` — Firebase config values
- `.env.production` — (same keys, production project later)

**Verification:**
- [ ] Firebase project visible in console
- [ ] Email/Password auth enabled
- [ ] Firestore database created
- [ ] Config values in `.env.development`

---

### Task 0.4: Firebase Emulator Suite
**What:** Local development without hitting production Firebase.

```bash
npm install -g firebase-tools
firebase login
firebase init
# Select: Firestore, Authentication, Functions, Emulators
# Emulators: Auth (9099), Firestore (8080), Functions (5001)
```

**Skills needed:** Firebase CLI, understanding of emulators
**AI strengths:** Generate `firebase.json` with correct emulator ports, write the emulator connection code
**Human strengths:** Run `firebase login` (requires browser auth)
**Best collaboration:** AI generates config, you authenticate and run init.

**Files to create/modify:**
- `firebase.json` — emulator configuration
- `.firebaserc` — project alias

**Verification:**
- [ ] `firebase emulators:start` runs without errors
- [ ] Auth emulator UI accessible at localhost:9099
- [ ] Firestore emulator UI accessible at localhost:8080

---

### Task 0.5: Firebase Initialization Code
**What:** Create the central Firebase config file that every service will import.

**File: `src/config/firebase.ts`**

Key decisions in this file:
- Use `indexedDBLocalPersistence` for Auth (required for Capacitor)
- Enable `persistentLocalCache` for Firestore offline
- Connect to emulators in development mode

**Skills needed:** Firebase SDK v10 modular API, understanding of persistence
**AI strengths:** This is 100% boilerplate that AI can generate perfectly. The persistence settings are tricky — AI knows the exact imports and configuration.
**Human strengths:** Understanding *why* we use indexedDB persistence (so you can debug if auth breaks on mobile)
**Best collaboration:** AI writes the file, explains each section. You read and understand it.

**Verification:**
- [ ] App connects to Firebase emulators in dev
- [ ] Console shows "Connected to Firestore emulator" (no production warnings)
- [ ] Auth emulator shows in Firebase emulator UI

---

### Task 0.6: Remove Ionic Starter Boilerplate
**What:** Delete default example pages, keep the tab layout structure as reference.

**AI strengths:** Identify all boilerplate files to remove
**Human strengths:** Decide what to keep vs. delete

**Files to delete:**
- Default tab pages (Tab1Page.vue, Tab2Page.vue, Tab3Page.vue)
- ExploreContainer.vue

**Files to modify:**
- `src/router/index.ts` — clear default routes
- `src/views/TabsLayout.vue` — keep structure, clear content

---

### Task 0.7: Error Handling & Result Type Infrastructure
**What:** Define the core error handling types and utilities that every service and composable will use from day one. This prevents the common problem of retrofitting error handling onto code that was written without it.

**Files to create:**
- `src/types/errors.ts` — `AppError` type and Firebase error code mapping
- `src/types/result.ts` — `Result<T>` discriminated union type
- `src/composables/useToast.ts` — Toast notification utility (`showSuccess`, `showError`, `showInfo`)

**Key types:**
```typescript
// src/types/result.ts
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

// src/types/errors.ts
export interface AppError {
  code: string;
  message: string;       // User-friendly message
  originalError?: unknown; // For logging
}
```

**Why Phase 0?** Every service method should return `Promise<Result<T>>` from the start. Every composable should expose `error: Ref<AppError | null>` and `isLoading: Ref<boolean>`. Building this as an afterthought (originally Phase 5) leads to inconsistent error handling across the codebase.

**Verification:**
- [ ] `Result<T>` type works with TypeScript inference
- [ ] `AppError` covers Firebase auth error codes and Firestore errors
- [ ] `useToast` shows success/error/info toasts correctly

---

### Task 0.8: Firestore Service Base Contract
**What:** Define the generic `FirestoreService<T>` base that all entity services will extend. This ensures a consistent contract across budget, purchase, category, and other services.

**File:** `src/services/firestore.service.ts`

**Contract:**
```typescript
// Generic base providing:
// - Firestore converter (Timestamp <-> Date, type-safe reads/writes)
// - create(data: T) -> Promise<Result<string>>   (returns doc ID)
// - getById(id: string) -> Promise<Result<T>>
// - getAll() -> Promise<Result<T[]>>
// - update(id: string, data: Partial<T>) -> Promise<Result<void>>
// - delete(id: string) -> Promise<Result<void>>
// - subscribe(callback) -> unsubscribe function  (lifecycle-managed)
```

**Why Phase 0?** The v1 project had inconsistent composables (`getCollection`, `useCollection`, `useDocument`) with different patterns and a memory leak in the subscription listener. Defining the contract upfront prevents this — every service returns `Result<T>`, every subscription returns an `unsubscribe` function that must be called.

**Verification:**
- [ ] Generic base compiles with TypeScript
- [ ] Converter handles Timestamp <-> Date conversion
- [ ] Subscribe returns a callable unsubscribe function

---

### Task 0.9: NPM Scripts Setup
**What:** Convenient development scripts.

```json
{
  "dev": "vite",
  "dev:firebase": "firebase emulators:start",
  "dev:all": "concurrently \"npm run dev\" \"npm run dev:firebase\"",
  "build": "vue-tsc && vite build",
  "test": "vitest",
  "cap:sync": "ionic cap sync",
  "cap:android": "ionic cap run android --livereload --external",
  "cap:ios": "ionic cap run ios --livereload --external"
}
```

Install concurrently: `npm install -D concurrently`

**Verification:**
- [ ] `npm run dev:all` starts both Vite and Firebase emulators
- [ ] App loads at localhost with emulators connected

---

## Phase 0 Complete Checklist
- [ ] Ionic + Vue 3 + TypeScript app runs in browser
- [ ] Firebase project created with Auth + Firestore enabled
- [ ] Firebase emulators running locally
- [ ] App connects to emulators in dev mode
- [ ] All dependencies installed (including Zod)
- [ ] `Result<T>` and `AppError` types defined and working
- [ ] `useToast` composable working (success/error/info)
- [ ] `FirestoreService<T>` base contract defined with subscription lifecycle
- [ ] Clean codebase (boilerplate removed)
- [ ] `npm run dev:all` is the single command to start development
