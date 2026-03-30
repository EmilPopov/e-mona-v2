# e-mona — Family Budget Management App — Implementation Plan

## Context

Emil is building **e-mona**, a mobile budget management app for families/groups/individuals. The goal is threefold: daily personal/family use, App Store/Google Play publishing, and a professional portfolio piece. The app tracks monthly budgets (incomes, predefined recurring payments, daily shopping orders) and provides analytics. It must work offline-first and support multiple users sharing a budget with role-based access.

---

## Stack

- **Frontend:** Vue.js 3 + TypeScript + Composition API
- **Mobile:** Ionic 8 + Capacitor 6
- **Backend:** Firebase (Auth email/password, Firestore, Cloud Functions v2)
- **State:** Pinia (setup syntax stores)
- **Charts:** vue-chartjs (Chart.js wrapper)

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Currency storage | Integer (smallest unit: stotinki/cents) | Avoids floating-point errors |
| Order location | Subcollection: `budgets/{id}/months/{id}/orders/{id}` | Natural scoping, cascading security rules |
| Denormalized totals | Cloud Function triggers update month doc | Dashboard loads in 1 read, not N+1 |
| Auth persistence | `indexedDBLocalPersistence` | Required for Capacitor WebView |
| Offline strategy | Firestore built-in + `@capacitor/network` | No custom sync needed |
| Pinia store style | Setup syntax (Composition API) | Better TypeScript inference |
| Month ID format | `"YYYY-MM"` string | Human-readable, naturally sortable |
| Roles | `memberIds[]` for rules + `members{}` map for UI | Array for O(1) security checks, map for role info |
| New month flow | Draft → Review → Active | Prevents accidental creation |

---

## Project Structure

```
e-mona/
├── android/                            # Capacitor Android
├── ios/                                # Capacitor iOS
├── functions/                          # Firebase Cloud Functions
│   └── src/
│       ├── index.ts
│       ├── scheduled/                  # monthlyBudgetGeneration, predefinedPayments, budgetAlerts
│       ├── triggers/                   # onOrderCreate, onOrderDelete, onMemberJoin
│       ├── callable/                   # inviteMember, exportCsv, confirmNewMonth
│       └── utils/
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── router/index.ts
│   ├── config/
│   │   ├── firebase.ts                # Firebase init + offline + emulators
│   │   └── constants.ts
│   ├── types/
│   │   ├── schemas.ts                 # All Zod schemas (single source of truth)
│   │   ├── types.ts                   # TypeScript types inferred via z.infer<>
│   │   ├── enums.ts
│   │   ├── errors.ts                  # AppError type + error code mapping
│   │   └── result.ts                  # Result<T> discriminated union
│   ├── stores/                        # Pinia stores (reactive state + subscriptions)
│   │   ├── auth.store.ts
│   │   ├── budget.store.ts
│   │   ├── orders.store.ts
│   │   ├── categories.store.ts
│   │   └── members.store.ts
│   ├── composables/                   # UI-facing logic (validation, formatting)
│   │   ├── useAuth.ts
│   │   ├── useBudget.ts
│   │   ├── useOrders.ts
│   │   ├── useCategories.ts
│   │   ├── useFavorites.ts
│   │   ├── useAnalytics.ts
│   │   ├── useCurrency.ts
│   │   └── useOffline.ts
│   ├── services/                      # Raw Firestore/Firebase operations
│   │   ├── firestore.service.ts       # Generic FirestoreService<T> base — CRUD, converters, subscription lifecycle
│   │   ├── auth.service.ts
│   │   ├── budget.service.ts
│   │   ├── purchase.service.ts
│   │   ├── category.service.ts
│   │   ├── item.service.ts
│   │   └── csv-export.service.ts
│   ├── views/
│   │   ├── auth/                      # LoginPage, RegisterPage, ForgotPasswordPage
│   │   ├── budget/                    # BudgetDashboard, BudgetSetup, NewMonthReview
│   │   ├── orders/                    # OrdersListPage, NewOrderPage, OrderDetailPage
│   │   ├── categories/               # CategoriesPage, CategoryDetailPage
│   │   ├── analytics/                # AnalyticsDashboard
│   │   ├── members/                  # MembersPage
│   │   ├── settings/                 # SettingsPage
│   │   └── TabsLayout.vue
│   ├── components/
│   │   ├── common/                   # AppHeader, CurrencyDisplay, OfflineBanner, EmptyState
│   │   ├── budget/                   # BudgetSummaryCard, BudgetProgressRing, RolloverToggle
│   │   ├── orders/                   # OrderCard, OrderItemRow, FavoritesGrid, ItemSearchBar
│   │   ├── categories/              # CategoryChip, CategoryPicker, CategoryIcon
│   │   ├── analytics/               # SpendingByCategory, MonthlyTrendChart, BudgetHealthGauge
│   │   └── members/                 # MemberListItem, InviteModal
│   └── theme/
│       ├── variables.css
│       ├── global.css
│       └── colors.ts
├── tests/
├── capacitor.config.ts
├── vite.config.ts
├── firebase.json
├── firestore.rules
└── firestore.indexes.json
```

**Architecture:** Components → Composables → Stores → Services → Firestore. Components never import services directly. All services return `Result<T>`. All Firestore writes are validated with Zod `.safeParse()` before sending. All subscriptions return unsubscribe functions.

---

## Firestore Data Model

```
users/{userId}
  ├── email, displayName, avatarColor, activeBudgetId, notificationPrefs, fcmTokens
  └── favorites/{favoriteId}  →  itemName, defaultPrice, categoryId, icon

budgets/{budgetId}
  ├── name, currency, createdBy, memberIds[], members{userId → role, displayName, email}
  ├── categories/{categoryId}  →  name, color, icon, parentCategoryId, sortOrder, isActive
  ├── items/{itemId}  →  name, defaultPrice, categoryId, icon, isActive, lastUsedAt
  ├── predefinedPayments/{paymentId}  →  name, amount, categoryId, frequency, yearlyMonth, isActive
  └── months/{monthId = "YYYY-MM"}
      ├── year, month, status(draft|active|closed)
      ├── incomes[], totalIncome, totalPredefined, totalOrders
      ├── rolloverAmount, rolloverEnabled
      ├── appliedPayments[]  (snapshot of predefined payments at confirmation time)
      └── orders/{orderId}
          ├── date, createdBy, createdByName, note
          ├── items[{itemId, name, price, quantity, categoryId, categoryName, categoryColor}]
          └── total (pre-calculated)

invitations/{invitationId}  →  budgetId, email, role, invitedBy, status, expiresAt
```

**Security rules:** `memberIds[]` array enables `request.auth.uid in resource.data.memberIds` checks. Admins manage budget/categories/payments. Members can create orders. Creators can edit/delete their own orders.

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1–3)
- Project scaffold: Ionic + Vue 3 + TypeScript + Capacitor
- Firebase setup: Auth, Firestore, emulator suite
- **Zod schemas as single source of truth** (`types/schemas.ts`, `types/types.ts`, `types/enums.ts`) — no manually written interfaces
- **Error infrastructure**: `Result<T>` type, `AppError` type, `useToast` composable, `FirestoreService<T>` base
- Auth flow: register, login, logout, forgot password, route guards
- **App startup sequence**: auth → user doc → activeBudgetId → budget → current month → purchases
- Budget CRUD: create budget, select currency, add initial incomes
- Tab navigation shell + dashboard skeleton
- Firestore security rules v1 + **automated security rules tests from day one**
- Offline persistence enabled
- **Files:** `firebase.ts`, `schemas.ts`, `types.ts`, `errors.ts`, `result.ts`, `firestore.service.ts`, `auth.service.ts`, `auth.store.ts`, `budget.service.ts`, `budget.store.ts`, `LoginPage.vue`, `RegisterPage.vue`, `BudgetSetup.vue`, `BudgetDashboard.vue`, `TabsLayout.vue`, `firestore.rules`, `firestore.rules.test.ts`

### Phase 2: Core Budget Operations (Weeks 4–5)
- Category management (CRUD, colors, icons, subcategories)
- Item catalog management
- Income management within monthly budgets
- **Purchase creation flow** (shopping trip: add multiple items, auto-calculate total)
- Purchase list view with daily grouping
- Budget dashboard summary card (income - expenses = remaining)
- Cloud Function triggers for denormalized totals (`onPurchaseCreate`, `onPurchaseDelete`)
- Real-time Firestore listeners with proper subscription lifecycle
- Extend security rules tests for budget + purchase rules
- **Files:** `category.service.ts`, `categories.store.ts`, `purchase.service.ts`, `purchases.store.ts`, `NewPurchasePage.vue`, `PurchasesListPage.vue`, `BudgetSummaryCard.vue`, `functions/src/triggers/`

### Phase 3: Multi-User & Recurring Payments (Weeks 6–7)
- Member invitation system (invite by email, accept/decline)
- Role-based UI (admin vs. member capabilities)
- Fixed costs and yearly goals CRUD
- New month generation from previous template + review screen
- Rollover toggle (carry leftover vs. fresh start)
- Scheduled Cloud Function for month-start auto-deduction
- "Added by" attribution on purchases
- Extend security rules tests for invitation + member rules
- **Files:** `member.service.ts`, `members.store.ts`, `MembersPage.vue`, `InviteModal.vue`, `NewMonthReview.vue`, `FixedCostCard.vue`, `functions/src/scheduled/`

### Phase 4: Favorites & UX Polish (Weeks 8–9)
- Favorites list (add/remove frequently bought items)
- Quick-add from favorites during purchase creation
- Item search with autocomplete
- Pull-to-refresh, loading skeletons, empty states
- **Error handling audit** — verify all services use `Result<T>` consistently (infra built in Phase 0)
- Offline banner (scoped to Firestore built-in persistence — no custom conflict resolution)
- **Files:** `useFavorites.ts`, `FavoritesGrid.vue`, `ItemSearchBar.vue`, `OfflineBanner.vue`, `EmptyState.vue`

### Phase 5: Analytics Dashboard (Weeks 9–10)
- Spending by category (doughnut chart)
- Monthly trend chart (bar/line)
- Month-over-month comparison
- Budget health gauge
- Top spending categories/items
- Per-member spending breakdown
- CSV export
- **Files:** `useAnalytics.ts`, `AnalyticsDashboard.vue`, `SpendingByCategory.vue`, `MonthlyTrendChart.vue`, `BudgetHealthGauge.vue`, `csv-export.service.ts`

### Phase 6: Notifications & Visual Polish (Weeks 10–11)
- FCM setup (iOS + Android)
- Daily expense logging reminder (configurable time)
- Budget threshold alerts (80%, overspent)
- Notification preferences screen
- Colorful & playful theme (Revolut/Monzo-inspired)
- Custom Ionic CSS properties
- App icon + splash screen

### Phase 7: Testing & App Store (Weeks 11–12)
- Unit tests (stores, composables, services)
- E2E tests (auth, purchase creation, budget flow)
- Security rules **final audit** — edge cases and attack scenarios (base tests already built per-phase)
- Performance audit (bundle size, Firestore read optimization)
- App store assets, privacy policy
- Android (Play Store) + iOS (App Store) submission

---

## Verification Plan

1. **Auth:** Register → login → logout → forgot password flow works on web and device
2. **Budget:** Create budget → add incomes → see dashboard totals update in real-time
3. **Orders:** Create shopping trip order with 3+ items → total calculates correctly → monthly balance updates
4. **Offline:** Add order while offline → reconnect → order syncs and balance updates
5. **Multi-user:** Invite member → member logs in → sees shared budget → adds order → admin sees it with attribution
6. **New month:** Month rolls over → review screen shows template → confirm → predefined payments auto-deduct
7. **Analytics:** Charts reflect actual spending data by category and time
8. **Notifications:** Daily reminder fires at configured time → budget alert fires at 80% threshold
9. **Security:** Member cannot edit budget settings → unauthenticated user cannot read any data
10. **Export:** CSV download contains all orders for selected month with correct totals
