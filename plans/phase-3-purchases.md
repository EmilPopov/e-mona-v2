# Phase 3: Purchases (Core Daily Flow)

**Duration:** Days 13–20
**Goal:** Users can create shopping-trip purchases with multiple items from mixed categories, view purchase history grouped by day, and see the dashboard update in real-time.

This is the most important phase — it's the feature users will use daily.

---

## Firestore Schema for This Phase

```
budgets/{budgetId}/months/{monthId}/purchases/{purchaseId}
  ├── date: Timestamp                     # When the purchase happened
  ├── createdBy: string                   # userId
  ├── createdByName: string               # Denormalized display name
  ├── note: string | null                 # "Lidl shopping", "Lunch with team"
  ├── items: [{                           # Array of items in this purchase
  │     itemId: string | null             # null if ad-hoc (not from catalog)
  │     name: string                      # "Bread"
  │     price: number                     # In cents per unit
  │     quantity: number                  # Default 1
  │     categoryId: string
  │     categoryName: string              # Denormalized for display
  │     categoryColor: string             # Denormalized for display
  │   }]
  ├── total: number                       # Pre-calculated sum (price × qty for each item)
  └── createdAt: Timestamp                # When it was logged in the app

budgets/{budgetId}/items/{itemId}          # Item catalog (for search/autocomplete)
  ├── name: string
  ├── defaultPrice: number                # Last known price
  ├── categoryId: string
  ├── icon: string
  ├── isActive: boolean
  └── lastUsedAt: Timestamp
```

---

## Tasks

### Task 3.1: Item Catalog Service
**What:** CRUD for the shared item catalog. The catalog starts pre-populated — 200 default items (20 per category) are seeded during budget creation (Phase 2, Task 2.4). Users can also add custom items, and new items from purchases auto-save to the catalog.

**Skills needed:** Firestore CRUD, search/filter patterns
**AI strengths:** Building efficient Firestore queries for item search (starts-with, case-insensitive). The "save to catalog" logic that auto-creates catalog items from purchases.
**Human strengths:** Deciding which items should auto-save to catalog vs. stay ad-hoc
**Best collaboration:** AI writes the service. You decide the auto-save rules.

**File:** `src/services/item.service.ts`

**Functions:**
- `getItems(budgetId)` → All active items
- `searchItems(budgetId, query)` → Filter by name prefix
- `createItem(budgetId, item)` → Add to catalog
- `updateItem(budgetId, itemId, updates)` → Update default price, etc.
- `deactivateItem(budgetId, itemId)` → Soft delete

**Auto-save rule:** After saving a purchase, any items not already in the catalog get added automatically. This builds the catalog organically on top of the 200 pre-seeded defaults.

**Verification:**
- [ ] Pre-seeded items (200) appear in search from day one
- [ ] Items can be created, searched, updated
- [ ] Search works with partial names ("bre" finds "Bread")
- [ ] New items from purchases auto-save to catalog
- [ ] Custom items coexist with seeded items

---

### Task 3.2: Purchase Service
**What:** CRUD for purchases within a month.

**Skills needed:** Firestore subcollection operations, batch writes
**AI strengths:** The total calculation logic, Firestore batch writes (create purchase + update month totals in one atomic operation). Proper Timestamp handling.
**Human strengths:** Verifying the numbers add up correctly with real test data
**Best collaboration:** AI writes the service with calculation logic. You verify with manual math.

**File:** `src/services/purchase.service.ts`

**Functions:**
- `createPurchase(budgetId, monthId, purchase)` → Creates purchase + updates month.totalPurchases
- `getPurchases(budgetId, monthId)` → All purchases for a month
- `subscribeToPurchases(budgetId, monthId, callback)` → Real-time listener
- `getPurchasesByDate(budgetId, monthId, date)` → Purchases for a specific day
- `deletePurchase(budgetId, monthId, purchaseId)` → Delete + recalculate total
- `updatePurchase(budgetId, monthId, purchaseId, updates)` → Edit + recalculate

**Critical: Atomic total updates**
When creating/deleting a purchase, the month's `totalPurchases` must update atomically. Use Firestore `increment()`:
```typescript
// On create:
updateDoc(monthRef, { totalPurchases: increment(purchaseTotal) });
// On delete:
updateDoc(monthRef, { totalPurchases: increment(-purchaseTotal) });
```

**Verification:**
- [ ] Creating a purchase updates month.totalPurchases
- [ ] Deleting a purchase decrements month.totalPurchases
- [ ] Total is correct (sum of price × quantity for all items)
- [ ] Concurrent purchases don't cause total to go wrong (test with two tabs)

---

### Task 3.3: Purchases Store (Pinia)
**What:** Reactive purchase state with real-time updates.

**Skills needed:** Pinia, real-time subscriptions, computed grouping
**AI strengths:** Grouping purchases by date for the UI (computed property that transforms flat list into grouped structure). Subscription lifecycle management.
**Human strengths:** Verifying the grouping looks right (today's purchases at top, yesterday below, etc.)
**Best collaboration:** AI writes the store with grouping logic. You test the display.

**File:** `src/stores/purchases.store.ts`

**Key computed:**
```typescript
// Group purchases by date for display
const purchasesByDate = computed(() => {
  const groups = new Map<string, Purchase[]>();
  for (const purchase of purchases.value) {
    const dateKey = formatDate(purchase.date); // "Today", "Yesterday", "Mar 24"
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(purchase);
  }
  return groups;
});

const todayTotal = computed(() => {
  const today = /* purchases from today */;
  return today.reduce((sum, p) => sum + p.total, 0);
});
```

---

### Task 3.4: New Purchase Page (The Most Important Screen)
**What:** Hybrid purchase creation — favorites grid + manual item form + cart.

**Skills needed:** Complex form management, Ionic components, reactive arrays
**AI strengths:** This is a complex interactive form with dynamic items, calculated totals, and multiple input methods. AI can handle the full component logic including add/remove items, quantity adjustment, and total calculation.
**Human strengths:** UX feel — is adding items fast enough? Is the cart clear? Does the flow feel natural on a phone? TESTING ON MOBILE IS CRITICAL HERE.
**Best collaboration:** AI builds the full page. You test on mobile (or browser responsive mode) and iterate. This page will need multiple rounds of refinement.

**File:** `src/views/purchases/NewPurchasePage.vue`

**Screen layout:**
```
┌───────────────────────────────┐
│  ← New Purchase               │
│  Note: [Lidl shopping     ]   │
│───────────────────────────────│
│                               │
│  ⭐ Favorites:                │
│  ┌──────┐ ┌──────┐ ┌──────┐  │
│  │🍞    │ │🥛    │ │🧀    │  │
│  │Bread │ │Milk  │ │Cheese│  │
│  │€1.20 │ │€1.90 │ │€4.30 │  │
│  └──────┘ └──────┘ └──────┘  │
│  ┌──────┐ ┌──────┐ ┌──────┐  │
│  │☕    │ │⛽    │ │🍎    │  │
│  │Coffee│ │Gas   │ │Fruit │  │
│  │€2.00 │ │€45   │ │€3.50 │  │
│  └──────┘ └──────┘ └──────┘  │
│───────────────────────────────│
│  Or add manually:             │
│  Name: [            ]         │
│  Price: [€    ]  Qty: [1]     │
│  Category: [Food         ▼]  │
│  [+ Add to cart]              │
│───────────────────────────────│
│                               │
│  🛒 Cart (3 items):           │
│  🍞 Bread    ×1    €1.20  ✕  │
│  🥛 Milk     ×2    €3.80  ✕  │
│  🧀 Cheese   ×1    €4.30  ✕  │
│───────────────────────────────│
│  Total:              €9.30    │
│                               │
│  [  ✅ Save Purchase  ]       │
│                               │
└───────────────────────────────┘
```

**Interaction details:**
1. **Tap a favorite** → Item added to cart with default price. Tap again → increases quantity. Long press → edit price before adding.
2. **Manual add** → Fill name/price/category, tap "Add to cart". Form clears for next item.
3. **Cart items** → Tap ✕ to remove. Tap item to edit price/quantity.
4. **Category auto-fill** → When adding from favorites or catalog, category pre-fills.
5. **Total** → Auto-calculates as cart changes.
6. **Save** → Creates purchase, updates month total, navigates back to dashboard.

**Supporting components:**
- `src/components/purchases/FavoritesGrid.vue` — Grid of tappable favorite items
- `src/components/purchases/CartItem.vue` — Single cart row with edit/delete
- `src/components/purchases/ManualItemForm.vue` — Name/price/qty/category form
- `src/components/categories/CategoryPicker.vue` — Dropdown for category selection

**Verification:**
- [ ] Can add items via favorites (tap to add)
- [ ] Can add items manually
- [ ] Cart total updates in real-time
- [ ] Category is required for each item
- [ ] Mixed categories work (bread=Food + shampoo=Health in same purchase)
- [ ] Saving creates purchase in Firestore
- [ ] Dashboard remaining balance updates after save
- [ ] Works well on mobile viewport (test with Chrome DevTools responsive)

---

### Task 3.5: Purchases List Page
**What:** View all purchases for the current month, grouped by date.

**Skills needed:** Ionic list, grouped layout, date formatting
**AI strengths:** Date grouping logic, Ionic virtual scroll for long lists
**Human strengths:** Design — how should the date headers look? What info shows per purchase?
**Best collaboration:** AI builds the list. You refine the card design.

**File:** `src/views/purchases/PurchasesListPage.vue`

**Layout:**
```
┌───────────────────────────────┐
│  🛒 Purchases    March 2026   │
│  [🔍 Search...]               │
│───────────────────────────────│
│                               │
│  Today • €21.40               │
│  ┌─────────────────────────┐  │
│  │ 🛒 Lidl         €12.50 │  │
│  │ Bread, Milk, Cheese     │  │
│  │ 10:30  👤 Emil          │  │
│  └─────────────────────────┘  │
│  ┌─────────────────────────┐  │
│  │ 🍔 Lunch         €8.90 │  │
│  │ Sandwich, Coffee        │  │
│  │ 13:00  👤 Emil          │  │
│  └─────────────────────────┘  │
│                               │
│  Yesterday • €45.00           │
│  ┌─────────────────────────┐  │
│  │ ⛽ Gas           €45.00 │  │
│  │ Fuel                    │  │
│  │ 18:15  👤 Maria         │  │
│  └─────────────────────────┘  │
│                               │
│ [🏠] [🛒] [➕] [📊] [•••]    │
└───────────────────────────────┘
```

**Supporting components:**
- `src/components/purchases/PurchaseCard.vue` — Single purchase card
- `src/components/purchases/DayGroup.vue` — Date header with daily total

**Features:**
- Tap a card → navigate to PurchaseDetailPage
- Swipe left → delete (with confirmation)
- Pull-to-refresh
- Basic month selector at top (left/right arrows + month name) to browse history

**Basic month selector component (created here, enhanced in Phase 6 Task 6.8):**
```
    [←]  March 2026  [→]
```
Create `src/components/common/MonthSelector.vue` — simple left/right navigation between available months. Phase 6 will add a picker dropdown and reuse it in the Analytics tab.

**Verification:**
- [ ] Purchases grouped by date
- [ ] Daily totals correct
- [ ] "Added by" shows correct user
- [ ] Swipe to delete works
- [ ] Deleting a purchase updates the month total

---

### Task 3.6: Purchase Detail Page
**What:** View/edit a single purchase.

**File:** `src/views/purchases/PurchaseDetailPage.vue`

**Features:**
- View all items with prices, quantities, categories
- Edit button (admin or creator) → enters edit mode
- Delete button with confirmation
- Category colors shown per item

**Verification:**
- [ ] All item details display correctly
- [ ] Creator can edit their own purchase
- [ ] Admin can edit any purchase
- [ ] Member cannot edit someone else's purchase

---

### Task 3.7: Cloud Function — Purchase Total Sync
**What:** Firestore trigger that updates `month.totalPurchases` when purchases change.

**Why a Cloud Function?** While we use `increment()` in the client, a Cloud Function provides a safety net — it can recalculate the total from all purchases to fix any drift. It also handles the case where the client goes offline mid-operation.

**Skills needed:** Firebase Cloud Functions v2, Firestore triggers
**AI strengths:** Cloud Functions boilerplate is verbose. AI generates it correctly with proper TypeScript typing. Also handles edge cases (what if the month doc doesn't exist yet?).
**Human strengths:** Understanding when the function runs and testing it with the emulator.
**Best collaboration:** AI writes the function. You test by creating/deleting purchases and checking the emulator function logs.

**Files:**
- `functions/src/triggers/onPurchaseCreate.ts`
- `functions/src/triggers/onPurchaseDelete.ts`
- `functions/src/triggers/onPurchaseUpdate.ts`
- `functions/src/index.ts` — export all functions

**Verification:**
- [ ] Creating a purchase triggers the function
- [ ] Month.totalPurchases matches sum of all purchase totals
- [ ] Deleting a purchase updates the total
- [ ] Check function logs in emulator UI

---

### Task 3.8: Dashboard Integration
**What:** Wire the purchase data into the dashboard from Phase 2.

**Updates to:**
- `BudgetDashboard.vue` — show recent purchases
- `BudgetSummaryCard.vue` — remaining balance now subtracts purchases
- `RecentPurchasesList.vue` — last 5 purchases with totals

**Verification:**
- [ ] Dashboard remaining balance = spending budget + rollover - total purchases
- [ ] Recent purchases show on dashboard
- [ ] Creating a purchase → dashboard updates in real-time (Firestore listener)

---

### Task 3.9: Security Rules (Purchases)
**What:** Any budget member can create purchases. Only the creator or admin can edit/delete.

**Rules:**
```
purchases/{purchaseId}:
  - read: budget member
  - create: budget member (and createdBy must equal auth.uid)
  - update/delete: creator OR admin
```

**Verification:**
- [ ] Member can create a purchase
- [ ] Member can edit/delete their OWN purchase
- [ ] Member CANNOT edit/delete someone else's purchase
- [ ] Admin CAN edit/delete any purchase
- [ ] Non-member cannot read purchases

---

## Phase 3 Complete Checklist
- [ ] Item catalog works with search
- [ ] New Purchase page works (favorites + manual + cart)
- [ ] Purchase total auto-calculates
- [ ] Mixed categories in one purchase works
- [ ] Purchase list grouped by date with daily totals
- [ ] Purchase detail view with edit/delete
- [ ] Cloud Function keeps month.totalPurchases in sync
- [ ] Dashboard remaining balance updates in real-time
- [ ] Security rules enforce creator/admin permissions
- [ ] Auto-save new items to catalog
- [ ] Works smoothly on mobile viewport
