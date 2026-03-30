# Phase 2: Budget Foundation

**Duration:** Days 7–12
**Goal:** Users can create a budget, add incomes, set up fixed costs and yearly goals. The monthly budget generates automatically with a review step. Dashboard shows remaining balance.

---

## Firestore Schema for This Phase

```
budgets/{budgetId}
  ├── name: string                        # "Popov Family Budget"
  ├── currency: CurrencyCode              # "EUR"
  ├── createdBy: string                   # userId of creator (becomes admin)
  ├── createdAt: Timestamp
  ├── memberIds: string[]                 # [creatorId] — used in security rules
  ├── members: {                          # Map for UI display
  │     [userId]: {
  │       role: "admin" | "member"
  │       displayName: string
  │       email: string
  │       joinedAt: Timestamp
  │     }
  │   }
  │
  ├── fixedCosts/{costId}                 # SUBCOLLECTION
  │     ├── name: string                  # "Rent", "Electricity"
  │     ├── amount: number                # In cents (€800 → 80000)
  │     ├── categoryId: string
  │     ├── icon: string                  # Ionicon name
  │     ├── isActive: boolean
  │     └── createdBy: string
  │
  ├── yearlyGoals/{goalId}                # SUBCOLLECTION
  │     ├── name: string                  # "Holiday", "Car maintenance"
  │     ├── targetAmount: number          # Yearly total in cents (€1200 → 120000)
  │     ├── monthlyAmount: number         # Auto-calculated: target ÷ 12
  │     ├── categoryId: string
  │     ├── icon: string
  │     ├── startMonth: string            # "2026-01" — when tracking started
  │     ├── isActive: boolean
  │     └── createdBy: string
  │
  ├── categories/{categoryId}             # SUBCOLLECTION
  │     ├── name: string
  │     ├── color: string                 # Hex color "#FF6B6B"
  │     ├── icon: string                  # Ionicon name
  │     ├── parentCategoryId: string | null
  │     ├── sortOrder: number
  │     └── isActive: boolean
  │
  ├── items/{itemId}                      # SUBCOLLECTION — Item catalog (seeded + organic)
  │     ├── name: string                  # "Bread"
  │     ├── name_lowercase: string        # "bread" — for prefix search in Phase 5
  │     ├── defaultPrice: number          # Last known price in cents
  │     ├── categoryId: string
  │     ├── icon: string                  # Ionicon name
  │     ├── isActive: boolean
  │     └── lastUsedAt: Timestamp | null  # Updated when used in a purchase
  │
  └── months/{monthId = "YYYY-MM"}        # SUBCOLLECTION
        ├── year: number
        ├── month: number                 # 1-12
        ├── status: "draft" | "active" | "closed"
        ├── incomes: [{                   # Array (not subcollection — usually 1-5 items)
        │     id: string
        │     name: string                # "Salary Emil", "Freelance"
        │     amount: number              # In cents
        │     addedBy: string
        │   }]
        ├── totalIncome: number           # Sum of incomes
        ├── totalFixedCosts: number       # Sum of applied fixed costs
        ├── totalGoalDeductions: number   # Sum of yearly goal monthly portions
        ├── totalPurchases: number        # Sum of all purchases (updated by Cloud Function)
        ├── spendingBudget: number        # totalIncome - totalFixedCosts - totalGoalDeductions
        ├── rolloverAmount: number        # From previous month (0 if fresh)
        ├── rolloverEnabled: boolean
        ├── confirmedAt: Timestamp | null
        ├── confirmedBy: string | null
        ├── appliedFixedCosts: [{         # Snapshot at confirmation time
        │     costId: string
        │     name: string
        │     amount: number
        │   }]
        ├── appliedGoalDeductions: [{     # Snapshot at confirmation time
        │     goalId: string
        │     name: string
        │     monthlyAmount: number
        │     accumulatedTotal: number    # Running total saved toward this goal
        │   }]                           # accumulatedTotal = sum of monthlyAmount
        │                                # across all prior months for this goalId
        │                                # Computed at month generation time (Task 2.8)
        │                                # by querying previous months' appliedGoalDeductions
        ├── alerts: {                    # Budget alert tracking (used by Phase 7)
        │     eightyPercentSent: boolean # true after 80% notification sent
        │     overspentSent: boolean     # true after overspent notification sent
        │   }
        └── purchases/{purchaseId}        # SUBCOLLECTION (Phase 3)
```

---

## Tasks

### Task 2.0: App Startup Sequence
**What:** Define and implement the exact data loading chain when the app opens. Each step has dependencies and failure modes that must be handled explicitly.

**Startup chain:**
```
1. Firebase init (Phase 0)
2. Check auth state (onAuthStateChanged) → if no user → /login
3. Load user document (users/{userId}) → if missing → create profile
4. Resolve activeBudgetId → if null → /budget/setup wizard
5. Subscribe to budget document (budgets/{activeBudgetId})
6. Determine current month (YYYY-MM format)
7. Check if month exists → if not → create as "draft" → show NewMonthReview
8. Subscribe to current month + purchases
9. App is ready → render dashboard
```

**Failure handlers at each step:**
- Step 2 fails: redirect to /login
- Step 3 fails: show error toast, retry
- Step 4 is null: redirect to /budget/setup
- Step 5 fails (budget deleted?): clear activeBudgetId, redirect to /budget/setup
- Steps 6-8 fail: show error state on dashboard with retry button

**Why this matters:** The v1 project loaded ALL collections eagerly via `initStore()` with no error handling. The v2 subcollection model requires scoped loading — you can't load purchases without knowing budgetId and monthId. This chain must be explicit.

**File:** Implemented across `App.vue`, `auth.store.ts`, and `budget.store.ts`

**Verification:**
- [ ] Fresh user → login → setup wizard → dashboard (full chain)
- [ ] Returning user → auto-auth → budget loads → dashboard
- [ ] New month → draft created → review screen shown
- [ ] Network error during startup → user-friendly error with retry
- [ ] Deleted budget → graceful redirect to setup

---

### Task 2.1: Budget Service
**What:** Firestore CRUD for budgets. This is the central service — most features touch it.

**Skills needed:** Firestore SDK (addDoc, getDoc, updateDoc, onSnapshot, withConverter)
**AI strengths:** Firestore converters for type safety are boilerplate-heavy. AI generates them correctly. Also handles Timestamp↔Date conversion (a common source of bugs).
**Human strengths:** Understanding the business logic — "why does creating a budget also update the user's activeBudgetId?"
**Best collaboration:** AI writes the service with inline comments. You read each function and make sure you understand the data flow.

**File:** `src/services/budget.service.ts`

**Functions:**
- `createBudget(name, currency, userId, userDisplayName, userEmail)` → Creates budget + updates user.activeBudgetId
- `getBudget(budgetId)` → Single read
- `subscribeToBudget(budgetId, callback)` → Real-time listener
- `updateBudget(budgetId, updates)` → Partial update
- `getUserBudgets(userId)` → Query where memberIds contains userId

---

### Task 2.2: Budget Store (Pinia)
**What:** Reactive budget state with computed properties for all the math.

**Skills needed:** Pinia, computed properties, subscription management
**AI strengths:** The budget math (spending budget, remaining balance) as computed properties. AI ensures the formulas are correct and reactive.
**Human strengths:** Verifying the math with real numbers ("if income is €3200 and fixed costs are €1520, spending budget should be €1680")
**Best collaboration:** AI writes the store with computed math. You test with sample data.

**File:** `src/stores/budget.store.ts`

**Key computed properties:**
```typescript
const spendingBudget = computed(() => {
  if (!currentMonth.value) return 0;
  return currentMonth.value.totalIncome
    - currentMonth.value.totalFixedCosts
    - currentMonth.value.totalGoalDeductions;
});

const remainingBalance = computed(() => {
  if (!currentMonth.value) return 0;
  return spendingBudget.value
    + currentMonth.value.rolloverAmount
    - currentMonth.value.totalPurchases;
});

const spentPercentage = computed(() => {
  if (spendingBudget.value === 0) return 0;
  return Math.round(
    (currentMonth.value!.totalPurchases / (spendingBudget.value + currentMonth.value!.rolloverAmount)) * 100
  );
});
```

---

### Task 2.3: Currency Composable
**What:** Format cents to display currency, and convert display amounts to cents.

**Skills needed:** Intl.NumberFormat API, basic math
**AI strengths:** `Intl.NumberFormat` has many options. AI knows the exact configuration for EUR/USD/GBP formatting.
**Human strengths:** Verifying formatting looks correct in the UI ("€1,247.50" not "1247.5")
**Best collaboration:** AI writes the composable, you verify formatting.

**File:** `src/composables/useCurrency.ts`

**Functions:**
- `format(amountInCents)` → "€12.50"
- `toCents(amount)` → 1250
- `fromCents(cents)` → 12.50

---

### Task 2.4: Default Categories & Items Seed Data
**What:** Pre-loaded categories with colors/icons AND 20 default items per category — seeded into `budgets/{budgetId}/categories/` and `budgets/{budgetId}/items/` on new budget creation.

**Skills needed:** UX design sense, icon knowledge
**AI strengths:** Generating a sensible list of categories with color assignments. AI knows the Ionicons library.
**Human strengths:** YOUR categories matter most — what does YOUR family actually spend on? Review and customize the defaults.
**Best collaboration:** AI generates a default set. You add/remove/rename based on your real spending patterns.

**Files:**
- `src/config/default-categories.ts`
- `src/config/default-items.ts`

**Suggested default categories (10):**
```
🍽️ Food & Groceries    #FF6B6B (red)
🚗 Transport           #4ECDC4 (teal)
🏠 Home & Utilities    #45B7D1 (blue)
💊 Health & Pharmacy   #96CEB4 (green)
🎉 Fun & Entertainment #FFEAA7 (yellow)
👕 Clothes & Shopping  #DDA0DD (purple)
☕ Cafes & Restaurants  #F39C12 (orange)
📱 Subscriptions       #6C5CE7 (indigo)
🎓 Education           #00B894 (emerald)
📦 Other               #95A5A6 (gray)
```

**Default items per category (20 each = 200 total):**

🍽️ **Food & Groceries:**
Bread, Milk, Eggs, Cheese, Chicken, Rice, Pasta, Butter, Yogurt, Tomatoes, Potatoes, Onions, Apples, Bananas, Olive Oil, Sugar, Flour, Water (bottle), Juice, Cereal

🚗 **Transport:**
Fuel, Parking, Bus Ticket, Train Ticket, Taxi, Metro Ticket, Car Wash, Toll Fee, Tire Service, Oil Change, Highway Vignette, Uber/Bolt, Car Insurance, Registration Fee, Brake Pads, Windshield Fluid, Air Freshener, Tram Ticket, Airport Transfer, Bicycle Repair

🏠 **Home & Utilities:**
Electricity, Water Bill, Internet, Rent, Gas Bill, Trash Bags, Cleaning Supplies, Light Bulbs, Toilet Paper, Paper Towels, Laundry Detergent, Dish Soap, Sponges, Air Freshener, Batteries, Extension Cord, Door Lock, Furniture Polish, Trash Pickup Fee, Home Insurance

💊 **Health & Pharmacy:**
Medicine, Vitamins, Toothpaste, Shampoo, Soap, Deodorant, Face Cream, Sunscreen, Band-Aids, Pain Killers, Cold Medicine, Eye Drops, Hand Sanitizer, Cotton Pads, Dental Floss, Razor Blades, Lip Balm, Allergy Medicine, Thermometer, First Aid Kit

🎉 **Fun & Entertainment:**
Cinema Ticket, Concert Ticket, Board Game, Video Game, Streaming Service, Book, Magazine, Museum Entry, Bowling, Escape Room, Pool Entry, Park Entry, Festival Ticket, Karaoke, Puzzle, Toy, Sports Event, Theatre Ticket, Amusement Park, Zoo Entry

👕 **Clothes & Shopping:**
T-Shirt, Jeans, Shoes, Socks, Underwear, Jacket, Sweater, Dress, Shorts, Belt, Hat, Gloves, Scarf, Sneakers, Sandals, Pajamas, Sportswear, Sunglasses, Watch, Bag

☕ **Cafes & Restaurants:**
Coffee, Espresso, Cappuccino, Tea, Latte, Croissant, Sandwich, Pizza, Burger, Sushi, Kebab, Salad, Soup, Dessert, Beer, Wine, Cocktail, Smoothie, Ice Cream, Breakfast

📱 **Subscriptions:**
Netflix, Spotify, YouTube Premium, iCloud, Google One, PlayStation Plus, Xbox Game Pass, Disney+, HBO Max, Amazon Prime, Apple Music, Gym Membership, Cloud Storage, VPN, Newspaper, App Store Purchase, Domain Name, Hosting, Adobe CC, Microsoft 365

🎓 **Education:**
Textbook, Online Course, Notebook, Pens, Pencils, Highlighters, Printer Paper, Ink Cartridge, Calculator, USB Drive, Backpack, Lunch Box, School Supplies, Tutor Session, Language Course, Exam Fee, Library Fee, Lab Materials, Art Supplies, Ruler

📦 **Other:**
Gift, Donation, Postage, Batteries, Tape, Glue, Scissors, Key Copy, Pet Food, Pet Toy, Dog Treats, Cat Litter, Plant, Flowers, Candles, Umbrella, Luggage, Travel Adapter, Power Bank, Phone Case

**Seeding flow:** When `createBudget()` runs (Task 2.1), it batch-writes all 10 categories + 200 items in a single Firestore batch (max 500 ops per batch, so 210 fits easily). Each item must include `name_lowercase: item.name.toLowerCase()` for prefix search support (used in Phase 5, Task 5.4).

**Verification:**
- [ ] Each category has a unique color
- [ ] Icons are valid Ionicon names
- [ ] Categories cover common spending areas
- [ ] 200 items seeded on budget creation
- [ ] Each item linked to correct category
- [ ] Items appear in search/autocomplete immediately

---

### Task 2.5: Budget Setup Wizard
**What:** Multi-step wizard when a new user creates their first budget. Runs after registration.

**Skills needed:** Ionic slides/stepper UX, multi-step forms
**AI strengths:** Generate the full wizard with step transitions, validation per step, and proper data collection. Multi-step forms are complex — AI can handle the boilerplate.
**Human strengths:** UX flow — does the wizard feel natural? Is the order of steps logical? Testing on mobile.
**Best collaboration:** AI builds the wizard. You walk through it as a user and suggest changes.

**File:** `src/views/budget/BudgetSetup.vue`

**Steps:**
```
Step 1: "Welcome! Let's set up your budget"
  → Budget name (e.g., "Popov Family")
  → Currency picker (EUR default, USD, GBP)

Step 2: "Add your income sources"
  → Name + Amount fields
  → [+ Add another income]
  → Must have at least one

Step 3: "Set up your fixed costs"
  → Name + Amount + Category picker
  → [+ Add another]
  → Show: "These will be auto-deducted each month"
  → Can skip (add later)

Step 4: "Any yearly savings goals?"
  → Name + Yearly target amount
  → Show calculated monthly deduction: "€1,200/year = €100/month"
  → [+ Add another]
  → Can skip

Step 5: Summary & Confirm
  → Show the budget math:
    Income: €3,200
    Fixed Costs: -€1,170
    Goal savings: -€183
    = Spending Budget: €1,847/month
  → [Create Budget]
```

**Verification:**
- [ ] Can complete all 5 steps
- [ ] Skipping fixed costs/goals works
- [ ] Budget created in Firestore with correct data
- [ ] User redirected to dashboard after creation
- [ ] First month created as "active"

---

### Task 2.6: Fixed Costs & Yearly Goals Management
**What:** Admin can add/edit/remove fixed costs and yearly goals after initial setup.

**Skills needed:** CRUD UI, Ionic components (ion-list, ion-item-sliding, ion-modal)
**AI strengths:** Generate CRUD pages with proper Ionic patterns (swipe to delete, modal for edit)
**Human strengths:** Deciding the UX for editing (modal vs. new page vs. inline edit)
**Best collaboration:** AI generates the management pages. You decide UX details.

**Files:**
- `src/services/fixed-cost.service.ts`
- `src/services/yearly-goal.service.ts`
- `src/views/budget/FixedCostsPage.vue`
- `src/views/budget/YearlyGoalsPage.vue`
- `src/components/budget/FixedCostItem.vue`
- `src/components/budget/YearlyGoalCard.vue` — with progress bar

**Yearly Goal Card preview:**
```
┌─────────────────────────────────┐
│ 🏖️ Holiday          €1,200/yr  │
│ €100/month                      │
│ ████████░░░░░░░░ €600 / €1,200 │
│ 50% saved • 6 months remaining  │
└─────────────────────────────────┘
```

**Verification:**
- [ ] Admin can add/edit/delete fixed costs
- [ ] Admin can add/edit/delete yearly goals
- [ ] Yearly goal shows progress bar with accumulated amount
- [ ] Monthly deduction amount auto-calculates (target ÷ 12)
- [ ] Changes reflect in the budget dashboard

---

### Task 2.7: Category Management
**What:** Admin can view, add, edit, reorder, and deactivate categories.

**Skills needed:** CRUD, color picker, icon picker
**AI strengths:** Color picker and icon picker components (Ionic has no built-in ones — AI can build custom ones)
**Human strengths:** Choosing which icons and colors look good together
**Best collaboration:** AI builds the category management page. You refine the visual design.

**Files:**
- `src/services/category.service.ts`
- `src/stores/categories.store.ts`
- `src/views/categories/CategoriesPage.vue`
- `src/components/categories/CategoryChip.vue` — colored badge
- `src/components/categories/ColorPicker.vue` — grid of preset colors
- `src/components/categories/IconPicker.vue` — grid of Ionicons

**Verification:**
- [ ] Default categories loaded on budget creation
- [ ] Admin can add new categories with custom name, color, icon
- [ ] Admin can edit existing categories
- [ ] Admin can deactivate (soft delete) categories
- [ ] Categories appear in purchase flow (Phase 3)

---

### Task 2.8: Monthly Budget Generation & Review
**What:** At month start, auto-generate a new month from the previous template. Admin reviews and confirms.

**Skills needed:** Firestore transactions, date logic, Cloud Functions (optional for auto-generation)
**AI strengths:** Date edge cases (what month is it? What if the user opens the app Feb 28 and it's now March?). Auto-generation logic with Firestore transactions to prevent duplicates.
**Human strengths:** Testing the flow — open app on the 1st, see the review screen, tweak incomes, confirm.
**Best collaboration:** AI writes the generation logic + review page. You test the month transition.

**Files:**
- `src/views/budget/NewMonthReview.vue`
- `src/composables/useBudget.ts` — extended with month logic

**New Month Review screen:**
```
┌───────────────────────────────┐
│   📋 March 2026 Budget        │
│   Based on February template  │
│───────────────────────────────│
│                               │
│  Income:              €3,200  │
│    Salary Emil    [€1,800] ✏️ │
│    Salary Maria   [€1,400] ✏️ │
│    [+ Add income]             │
│                               │
│  Fixed Costs:         €1,170  │
│    ✓ Rent              €800   │
│    ✓ Electricity       €120   │
│    ✓ Car payment       €250   │
│                               │
│  Yearly Goals:          €183  │
│    ✓ Holiday      €100/mo     │
│    ✓ Car maint.    €83/mo     │
│                               │
│  ☑ Rollover from February     │
│    Leftover: €124.50          │
│───────────────────────────────│
│  Spending Budget:     €1,847  │
│  + Rollover:           €124   │
│  = Available:         €1,971  │
│                               │
│  [ ✅ Confirm March Budget ]  │
└───────────────────────────────┘
```

**Logic:**
1. When user navigates to dashboard and current month doesn't exist → auto-create as "draft"
2. Copy incomes from previous month
3. Snapshot active fixed costs and yearly goals
4. Show review screen
5. Admin can edit income amounts before confirming
6. On confirm: status → "active", record confirmedAt/confirmedBy
7. Calculate accumulated totals for yearly goals
8. Initialize `alerts: { eightyPercentSent: false, overspentSent: false }` on the new month document (used by Phase 7 budget alert notifications — ensures fresh alerts each month)

**Rollover logic:**
- Check previous month's remaining balance
- Show toggle: "Carry over €124.50 from February?"
- If enabled, rolloverAmount = previous remaining
- If disabled, rolloverAmount = 0

**Verification:**
- [ ] Opening app in new month shows review screen
- [ ] Incomes are editable
- [ ] Rollover toggle works
- [ ] Confirming creates an "active" month
- [ ] Budget math is correct on dashboard
- [ ] Yearly goal accumulated totals update correctly

---

### Task 2.9: Budget Dashboard (Home Screen)
**What:** The main screen — balance-first with recent purchases.

**Skills needed:** Ionic components, reactive computed values, layout design
**AI strengths:** Wiring up the Pinia store computed values to the UI. Responsive layout.
**Human strengths:** Visual polish — does the big balance number feel impactful? Are the colors right?
**Best collaboration:** AI builds the functional dashboard. You iterate on visual design.

**File:** `src/views/budget/BudgetDashboard.vue`

**Layout:**
```
┌───────────────────────────────┐
│  e-mona 🪙         March 26  │
│───────────────────────────────│
│                               │
│       Remaining               │
│       €1,247.50               │
│   ████████████░░░░░ 68%       │
│                               │
│  Income      €3,200           │
│  Fixed       -€1,170          │
│  Goals       -€183            │
│  Rollover    +€124.50         │  ← only shown when > 0
│  Purchases   -€599.50         │
│───────────────────────────────│
│                               │
│  Recent Purchases:            │
│  🛒 Lidl      Today   -€12.50│
│  ⛽ Gas       Today   -€45.00│
│  🍔 Lunch    Yesterday -€8.90│
│                               │
│     [+ New Purchase]          │
│                               │
│ [🏠] [🛒] [➕] [📊] [•••]    │
└───────────────────────────────┘
```

**Components to create:**
- `src/components/budget/BudgetSummaryCard.vue` — the balance + progress bar
- `src/components/budget/BudgetBreakdown.vue` — income/fixed/goals/purchases lines
- `src/components/budget/RecentPurchasesList.vue` — last 5 purchases (wired in Phase 3)

**Verification:**
- [ ] Remaining balance displays correctly
- [ ] Progress bar reflects spending percentage
- [ ] Breakdown numbers add up correctly
- [ ] "New Purchase" button navigates to purchase flow
- [ ] Pull-to-refresh works

---

### Task 2.10: More Menu Page
**What:** The "More" tab landing page — a menu that links to all settings and management pages.

**Skills needed:** Ionic list, navigation
**AI strengths:** Simple page with navigation links. AI can generate the full list with correct icons and routes.
**Human strengths:** Deciding the order and grouping of menu items.
**Best collaboration:** AI generates the page. You verify all links work.

**File:** `src/views/more/MoreMenu.vue`

**Route:** `/tabs/more` (already defined in Phase 1 router)

**Screen:**
```
┌───────────────────────────────┐
│  ••• More                     │
│───────────────────────────────│
│                               │
│  👤 Profile & Settings    [→] │
│  💰 Fixed Costs           [→] │
│  🎯 Yearly Goals          [→] │
│  🏷️ Categories            [→] │
│  👥 Members               [→] │  ← Phase 4
│  🔔 Notifications         [→] │  ← Phase 7
│  📤 Export Data            [→] │  ← Phase 6
│                               │
│  App version: 1.0.0           │
└───────────────────────────────┘
```

**Notes:**
- Start with links available in Phase 2: Profile, Fixed Costs, Yearly Goals, Categories
- Phase 4 adds Members link, Phase 6 adds Export, Phase 7 adds Notifications
- Use `v-if="isAdmin"` to hide admin-only links (Fixed Costs, Goals, Categories management) from members (Phase 4)

**Verification:**
- [ ] All links navigate to the correct page
- [ ] Back navigation returns to More menu
- [ ] Menu items appear/disappear based on available features

---

### Task 2.11: Firestore Security Rules (Budget)
**What:** Secure budget access — only members can read, only admins can manage settings.

**File:** `firestore.rules` (extend from Phase 1)

**Rules:**
```
budgets/{budgetId}:
  - read: memberIds contains auth.uid
  - create: authenticated
  - update/delete: members[auth.uid].role == "admin"

  categories, fixedCosts, yearlyGoals:
    - read: budget member
    - write: budget admin

  months/{monthId}:
    - read: budget member
    - create/update: budget admin
```

**Important:** Extend the automated security rules tests from Phase 1 (`tests/security/firestore.rules.test.ts`) with budget-specific test cases. Keep all rules tests in one place and run them after every rules change.

**Note on subcollection rules:** Checking `memberIds[]` on a purchase requires reading the parent budget document via `get()` in security rules. This costs an extra Firestore read per request. To minimize this cost, consider duplicating `memberIds` on month documents so purchase rules don't need to hop two levels up.

**Verification:**
- [ ] Member can read budget but not edit it
- [ ] Admin can edit budget settings
- [ ] Non-member cannot read the budget at all
- [ ] Automated security rules tests pass for all budget rules
- [ ] Test all rules in Firebase emulator

---

## Phase 2 Complete Checklist
- [ ] Budget creation wizard works end-to-end
- [ ] Default categories pre-loaded
- [ ] Fixed costs and yearly goals CRUD working
- [ ] Yearly goals show progress bars
- [ ] Monthly budget generation + review screen works
- [ ] Rollover toggle works
- [ ] Dashboard displays correct remaining balance
- [ ] Budget math: Income - Fixed - Goals = Spending Budget verified
- [ ] More menu links to all available pages
- [ ] Security rules tested
- [ ] Currency formatting works (€1,247.50 not 124750)
