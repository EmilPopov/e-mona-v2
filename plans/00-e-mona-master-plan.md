# e-mona — Master Implementation Plan

## What is e-mona?
A mobile budget management app for families, groups, and individuals. Track monthly income, fixed costs, yearly savings goals, and daily purchases — all in a colorful, offline-first app built with Vue.js + Ionic + Firebase.

## Why build it?
1. **Personal use** — a tool your family actually uses daily to control spending
2. **App Store publication** — publish on Google Play and App Store
3. **Portfolio piece** — showcase clean architecture and polished UX

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vue.js 3 + TypeScript + Composition API |
| Mobile | Ionic 8 + Capacitor 6 |
| State | Pinia (setup syntax) |
| Backend | Firebase Auth, Firestore, Cloud Functions v2 |
| Charts | vue-chartjs (Chart.js wrapper) |
| Offline | Firestore built-in persistence + @capacitor/network |

---

## Budget Math
```
+ Income (salaries, freelance, etc.)
- Fixed Costs (rent, electricity, car payment, etc.)
- Yearly Goals ÷ 12 (holiday savings, car maintenance, etc.)
= Spending Budget
- Daily Purchases (shopping trips)
= REMAINING BALANCE ← this is the big number on the dashboard
```

---

## Naming Conventions
| Concept | Term in App | Description |
|---------|-------------|-------------|
| Shopping trip | **Purchase** | A trip to Lidl with 5 items |
| Thing bought | **Item** | Bread, milk, shampoo inside a purchase |
| Monthly bill | **Fixed Cost** | Rent, electricity — deducted automatically |
| Annual target | **Yearly Goal** | Holiday €1,200/yr → €100/mo with progress bar |
| Budget period | **Month** | Calendar month (1st–31st) for v1 |

---

## App Structure (5 Tabs)
```
[🏠 Home]  [🛒 Purchases]  [➕ ADD]  [📊 Analytics]  [••• More]
```
- **Home** — Balance-first dashboard, remaining balance, recent purchases
- **Purchases** — Full history, daily grouping, search/filter
- **➕ ADD** — Center FAB → New Purchase flow (favorites grid + manual form)
- **Analytics** — Charts, trends, category breakdown
- **More** — Settings, Members, Categories, Fixed Costs, Goals, Profile, Export

---

## Phases Overview

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| 0 | [Project Setup](phase-0-project-setup.md) | Days 1–3 | Scaffold, Firebase, dev environment, Zod, error infra, service base |
| 1 | [Auth & User System](phase-1-auth-and-users.md) | Days 4–8 | Registration, login, user profiles, security rules tests |
| 2 | [Budget Foundation](phase-2-budget-foundation.md) | Days 9–18 | App startup sequence, budget creation, incomes, fixed costs, yearly goals |
| 3 | [Purchases](phase-3-purchases.md) | Days 19–30 | Purchase flow, items, cart, categories, dashboard update |
| 4 | [Multi-User & Invitations](phase-4-multi-user.md) | Days 31–40 | Invite codes, roles, shared budget, attribution |
| 5 | [Favorites & UX Polish](phase-5-favorites-ux.md) | Days 41–50 | Favorites, search, offline UX, loading states, error audit |
| 6 | [Analytics & Export](phase-6-analytics-export.md) | Days 51–60 | Charts, trends, CSV export |
| 7 | [Notifications & Theme](phase-7-notifications-theme.md) | Days 61–70 | Push notifications, colorful theme, app polish |
| 8 | [Testing & Launch](phase-8-testing-launch.md) | Days 71–84 | Unit/E2E tests, security audit, performance, app store submission |

> **Timeline note:** Expanded from 54 to 84 days (~12 weeks) to account for Capacitor/native platform issues, Firebase emulator quirks, Ionic CSS challenges on different devices, and multi-user testing complexity. Core daily use (purchases) is usable by day 30.

---

## Key Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Type system | Zod schemas → inferred TypeScript types | Single source of truth for validation + types. Validate before every Firestore write |
| Error handling | `Result<T>` discriminated union | Every service returns typed success/error. No raw try/catch or console.log |
| Service contract | Generic `FirestoreService<T>` base | Consistent CRUD, managed subscriptions, Timestamp conversion, no memory leaks |
| Currency storage | Integers (cents) | No floating-point bugs: €12.50 → 1250 |
| Purchase location | `budgets/{id}/months/{id}/purchases/{id}` | Scoped queries, cascading security rules |
| Denormalized totals | Cloud Function triggers | Dashboard = 1 read instead of N+1 |
| Auth persistence | `indexedDBLocalPersistence` | Required for Capacitor WebView |
| Month ID | `"YYYY-MM"` string | Human-readable, sortable |
| Roles storage | Array `memberIds[]` + Map `members{}` | Array for fast security rules, map for UI |
| New month | Draft → Review → Active | Prevents accidental month creation |
| Security rules testing | Automated from Phase 1 | Prevents subtle bugs (operator precedence, missing checks). Extend each phase |
| Offline scope | Firestore built-in persistence only | No custom conflict resolution for v1. Reads from cache, writes queue and sync |

---

## Firestore Data Model (Overview)
```
users/{userId}
  └── favorites/{favoriteId}

budgets/{budgetId}
  ├── categories/{categoryId}
  ├── items/{itemId}
  ├── fixedCosts/{costId}
  ├── yearlyGoals/{goalId}
  └── months/{monthId = "YYYY-MM"}
      └── purchases/{purchaseId}

invitations/{invitationId}
```

See each phase file for the detailed document schemas.
