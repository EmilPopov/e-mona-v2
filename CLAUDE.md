# e-mona v2 — Project Context for Claude Code

## What is this?
A mobile budget management app for families, groups, and individuals. Track monthly income, fixed costs, yearly savings goals, and daily purchases — offline-first, built with Vue.js + Ionic + Firebase.

## Tech Stack
- **Frontend:** Vue.js 3 + TypeScript + Composition API
- **Mobile:** Ionic 8 + Capacitor 6
- **State:** Pinia (setup/composition syntax)
- **Backend:** Firebase Auth, Firestore, Cloud Functions v2
- **Validation:** Zod (schemas = single source of truth for types)
- **Charts:** vue-chartjs (Chart.js wrapper)
- **Offline:** Firestore built-in persistence + @capacitor/network
- **Build:** Vite
- **Testing:** Vitest + Firebase Emulator Suite

## Architecture Rules (non-negotiable)
1. **Layer flow:** Components → Composables → Stores → Services → Firestore
2. **Error handling:** Every service returns `Promise<Result<T>>` — never raw try/catch
3. **Validation:** All Firestore writes validated with Zod before sending
4. **Currency:** Always integers (cents/stotinki) — `€12.50 = 1250`
5. **Subscriptions:** Always return unsubscribe functions, manage lifecycle
6. **Types:** Zod schemas in `src/types/schemas.ts` → inferred TypeScript types in `src/types/types.ts`
7. **Month IDs:** `"YYYY-MM"` string format
8. **Auth persistence:** `indexedDBLocalPersistence` (required for Capacitor)
9. **Denormalized totals:** Updated via Cloud Function triggers, not client-side
10. **Security rules testing:** Automated from Phase 1 onward

## Key Patterns
- **Services:** Generic `FirestoreService<T>` base with consistent CRUD, Timestamp conversion
- **Stores:** Pinia setup syntax, real-time Firestore subscriptions, lifecycle-managed
- **Composables:** UI logic layer — validation, formatting, event handling
- **Components:** Ionic components preferred, thin wrappers over composables

## Naming Conventions
- Purchase = a shopping trip (e.g., Lidl visit with 5 items)
- Item = individual product bought (bread, milk)
- Fixed Cost = recurring monthly bill
- Yearly Goal = annual savings target ÷ 12
- Month = budget period (calendar month)

## Budget Math
```
Income - Fixed Costs - (Yearly Goals ÷ 12) = Spending Budget
Spending Budget - Purchases = REMAINING BALANCE
```

## Firestore Structure
```
users/{userId} → favorites/{favoriteId}
budgets/{budgetId} → categories, items, fixedCosts, yearlyGoals, months/{YYYY-MM} → purchases/{id}
invitations/{invitationId}
```

## Phase Plans
All implementation plans are in `/plans/`. Read the relevant phase file before starting work.

## Agent Team
Specialized agents live in `.claude/agents/`. Use them as follows:

| Agent | Model | Purpose | When to Use |
|-------|-------|---------|-------------|
| **orchestrator** | Opus | Plans phases, dispatches parallel work, tracks dependencies | Starting a new phase or planning work |
| **architect** | Opus | Audits architecture, validates design decisions | After a phase completes or before major design |
| **frontend** | Opus | Vue/Ionic components, views, composables, Pinia stores | Building UI features |
| **firebase** | Opus | Services, Cloud Functions, security rules | Building backend/data layer |
| **tester** | Sonnet | Unit tests, security rules tests, E2E | Writing and running tests |
| **reviewer** | Sonnet | Code review against project standards | Before committing or after a stream completes |

### Workflow
1. **Orchestrator** reads the phase plan, identifies parallel streams, surfaces decisions to user
2. **Firebase** + **Frontend** agents work in parallel on independent streams
3. **Reviewer** checks each completed stream
4. **Tester** writes tests for completed features
5. **Architect** audits the full phase before moving on

### ALL agents MUST ask the user when anything is unclear. Never guess.

## Commands
```bash
npm run dev              # Vite dev server
npm run dev:firebase     # Firebase emulators
npm run build            # TypeScript check + Vite build
npm run test             # Vitest
npm run cap:sync         # Sync to native projects
```

## Code Style
- TypeScript strict mode
- Vue 3 `<script setup lang="ts">` for all components
- Pinia setup syntax (not options)
- Path aliases: `@/` maps to `src/`
- No `any` types — use `unknown` + type narrowing
- No `console.log` — use Result<T> error handling
- Ionic components over custom HTML where possible
