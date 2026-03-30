# Phase 5: Favorites & UX Polish

**Duration:** Days 27–32
**Goal:** Favorites system for quick purchases, item search with autocomplete, offline UX, loading states, and overall app polish.

---

## Firestore Schema for This Phase

```
users/{userId}/favorites/{favoriteId}
  ├── itemName: string
  ├── defaultPrice: number              # In cents
  ├── categoryId: string
  ├── categoryName: string              # Denormalized
  ├── categoryColor: string             # Denormalized
  ├── icon: string
  ├── sortOrder: number                 # User can reorder
  └── addedAt: Timestamp
```

Favorites are **per-user** (not per-budget) because personal favorites differ between family members.

---

## Tasks

### Task 5.1: Favorites Service & Store
**What:** CRUD for favorites. Each user has their own favorites list.

**Skills needed:** Firestore subcollection queries, user-scoped data
**AI strengths:** Service + store boilerplate with real-time listener for favorites.
**Human strengths:** Deciding which items should be in your personal favorites — this is deeply personal.
**Best collaboration:** AI writes the code. You curate your own favorites list.

**Files:**
- `src/services/favorites.service.ts`
- `src/composables/useFavorites.ts`

**Functions:**
- `getFavorites(userId)` → User's favorites ordered by sortOrder
- `addFavorite(userId, item)` → Add item to favorites
- `removeFavorite(userId, favoriteId)` → Remove
- `reorderFavorites(userId, orderedIds)` → Update sort order

---

### Task 5.2: Favorites Grid Component
**What:** The tappable grid of favorite items shown in the New Purchase page.

**Skills needed:** CSS Grid, touch interactions, Ionic gestures
**AI strengths:** Grid layout, tap vs. long-press handling, haptic feedback integration (Capacitor Haptics plugin)
**Human strengths:** Tuning the tap feel — how big should tiles be? How fast should it respond?
**Best collaboration:** AI builds the grid. You test on mobile for feel. Multiple iterations expected.

**File:** `src/components/purchases/FavoritesGrid.vue`

**Interactions:**
- **Tap** → Add to cart with default price
- **Tap again (already in cart)** → Increment quantity
- **Long press** → Show price edit popup before adding
- **Visual feedback:** Brief scale animation + subtle color change on tap
- **Badge:** Show quantity indicator if item is in cart (e.g., "×2")

**Grid tile:**
```
┌──────────┐
│  🍞      │
│  Bread   │
│  €1.20   │
│    [×2]  │  ← shown when in cart
└──────────┘
```

**Verification:**
- [ ] Tap adds item to cart
- [ ] Repeat tap increments quantity
- [ ] Long press shows price editor
- [ ] Visual feedback on tap
- [ ] Quantity badge appears
- [ ] Grid scrolls horizontally if many favorites

---

### Task 5.3: "Add to Favorites" Flow
**What:** After creating a purchase, offer to save new items as favorites.

**Skills needed:** Post-save flow, Ionic toasts/modals
**AI strengths:** The "suggest new favorites" logic — detect items not in favorites list, prompt user.
**Human strengths:** Deciding when to prompt (every time? Only for new items?)
**Best collaboration:** AI implements. You decide the UX trigger.

**Flow:**
1. User saves a purchase
2. App checks: any items in this purchase that are NOT in favorites?
3. If yes, show a toast: "Add Bread and Shampoo to favorites?" → [Yes] [No]
4. If yes, add to favorites with the purchase price as default price

**Alternative: Manual add**
- In the purchases list, swipe an item → "⭐ Add to Favorites"
- In favorites management page → "+" button to add manually

**Verification:**
- [ ] Post-purchase prompt appears for new items
- [ ] Items can be added to favorites from purchase detail
- [ ] Favorites management page accessible from More menu

---

### Task 5.4: Item Search with Autocomplete
**What:** Search bar in New Purchase page that searches the item catalog.

**Skills needed:** Debounced search, Firestore queries, dropdown UI
**AI strengths:** Debounced input handling, Firestore query optimization (prefix search), dropdown positioning.
**Human strengths:** Testing search speed and relevance. Does "bre" find "Bread" quickly enough?
**Best collaboration:** AI implements search. You test with real catalog data.

**File:** `src/components/purchases/ItemSearchBar.vue`

**Behavior:**
- User types in search bar → debounce 300ms → query catalog items
- Results appear in dropdown below search bar
- Tap a result → adds to cart with default price (editable)
- If no results → show "Add '[typed text]' as new item" option
- Search is case-insensitive

**Implementation note:** Firestore doesn't support full-text search natively. Use a prefix approach:
```typescript
// Search for items starting with "bre"
query(itemsRef,
  where('name_lowercase', '>=', 'bre'),
  where('name_lowercase', '<=', 'bre\uf8ff'),
  limit(10)
);
```
This requires storing a `name_lowercase` field on catalog items.

**Verification:**
- [ ] Typing "bre" shows "Bread" in results
- [ ] Tapping result adds to cart
- [ ] "Add as new item" option works when no results
- [ ] Search is fast (<500ms)
- [ ] Debounce prevents excessive Firestore reads

---

### Task 5.5: Offline UX
**What:** Show offline status, handle offline writes gracefully.

**Skills needed:** Capacitor Network plugin, conditional UI
**AI strengths:** Network state detection composable, offline banner component. AI knows the Capacitor Network API.
**Human strengths:** Testing offline behavior — put phone in airplane mode, add a purchase, reconnect. Does it sync?
**Best collaboration:** AI builds offline detection. You test real offline scenarios.

**Files:**
- `src/composables/useOffline.ts`
- `src/components/common/OfflineBanner.vue`

**useOffline composable:**
```typescript
export function useOffline() {
  const isOffline = ref(false);

  // Listen to Capacitor Network changes
  Network.addListener('networkStatusChange', (status) => {
    isOffline.value = !status.connected;
  });

  // Initial check
  Network.getStatus().then(status => {
    isOffline.value = !status.connected;
  });

  return { isOffline };
}
```

**OfflineBanner:**
```
┌───────────────────────────────┐
│  📡 You're offline            │
│  Changes will sync when       │
│  you're back online           │
└───────────────────────────────┘
```

- Shows at the top of the screen when offline
- Subtle yellow/orange color
- Non-blocking — user can still use the app

**What works offline (thanks to Firestore persistence):**
- ✅ View cached dashboard + purchases
- ✅ Create new purchases (queued for sync)
- ✅ Edit existing purchases
- ❌ Can't invite members (needs server)
- ❌ Can't validate invite codes

**Verification:**
- [ ] Offline banner appears in airplane mode
- [ ] Banner disappears when back online
- [ ] Can view dashboard while offline
- [ ] Can create purchase while offline
- [ ] Purchase syncs when back online
- [ ] No error popups while offline

---

### Task 5.6: Loading States & Skeletons
**What:** Replace raw loading spinners with skeleton screens for a polished feel.

**Skills needed:** Ionic skeleton components, conditional rendering
**AI strengths:** Generate skeleton layouts that match the actual component shapes. Ionic has built-in `ion-skeleton-text`.
**Human strengths:** Visual review — do the skeletons match the real layout closely enough?
**Best collaboration:** AI creates skeleton versions. You compare side by side.

**Files:**
- `src/components/common/LoadingSpinner.vue` — fallback spinner
- Skeleton variants for key screens:
  - Dashboard skeleton (balance placeholder, recent purchases placeholder)
  - Purchase list skeleton (card placeholders)

**Pattern:**
```vue
<template>
  <div v-if="loading">
    <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
    <ion-skeleton-text animated style="width: 80%"></ion-skeleton-text>
  </div>
  <div v-else>
    <!-- actual content -->
  </div>
</template>
```

**Verification:**
- [ ] Dashboard shows skeleton on first load
- [ ] Purchase list shows skeleton on load
- [ ] Skeletons match the shape of actual content
- [ ] Transition from skeleton to content is smooth

---

### Task 5.7: Empty States
**What:** Friendly screens when there's no data yet (no purchases, no categories, etc.)

**Skills needed:** Illustration/design sense, UX writing
**AI strengths:** Generate empty state component with props for different scenarios
**Human strengths:** Writing the messages — "No purchases yet. Tap + to log your first one!" The tone matters.
**Best collaboration:** AI builds the component. You write the messages.

**File:** `src/components/common/EmptyState.vue`

**Props:** icon, title, description, actionLabel, actionHandler

**Scenarios:**
- No purchases this month: "Nothing spent yet this month! 🎉"
- No favorites: "Add favorites for one-tap purchasing"
- No members: "Invite your family to share this budget"
- No fixed costs: "Set up your recurring bills"

**Verification:**
- [ ] Empty state shows when purchase list is empty
- [ ] Empty state shows when favorites are empty
- [ ] Action button works (navigates to the right place)
- [ ] Looks friendly and encouraging, not broken

---

### Task 5.8: Error Handling Audit
**What:** By this phase, `Result<T>`, `AppError`, and `useToast` already exist (Phase 0). This task is an **audit** — review all services and composables to ensure they consistently use the error infrastructure. Fix any that were missed or use raw try/catch without `Result<T>`.

**Checklist:**
- [ ] Every service method returns `Promise<Result<T>>`
- [ ] Every composable exposes `error: Ref<AppError | null>` and `isLoading: Ref<boolean>`
- [ ] Every user action shows a toast on success/failure
- [ ] No raw `console.log` error handling remains
- [ ] Firebase error codes are mapped to user-friendly messages everywhere

**Verification:**
- [ ] Success toast after saving purchase
- [ ] Error toast with friendly message on failure
- [ ] Toasts don't overlap or stack excessively
- [ ] No raw Firebase errors visible to the user

---

### Task 5.9: Pull-to-Refresh on All Lists
**What:** Standard mobile pattern — pull down to refresh data.

**Skills needed:** Ionic refresher component
**AI strengths:** Wiring up `ion-refresher` to store reload functions
**Human strengths:** Testing the feel — does the pull gesture feel natural?

**Pattern:**
```vue
<ion-refresher slot="fixed" @ionRefresh="handleRefresh">
  <ion-refresher-content></ion-refresher-content>
</ion-refresher>
```

**Add to:** Dashboard, Purchases List, Members Page

**Verification:**
- [ ] Pull-to-refresh works on all main list screens
- [ ] Data actually refreshes (not just animation)
- [ ] Spinner completes when data is loaded

---

## Phase 5 Complete Checklist
- [ ] Favorites CRUD working
- [ ] Favorites grid in New Purchase page with tap-to-add
- [ ] Long press on favorite to edit price before adding
- [ ] Quantity badge on favorites already in cart
- [ ] "Add to favorites" prompt after purchase
- [ ] Item search with autocomplete works
- [ ] Offline banner shows/hides correctly
- [ ] App works offline (view + create purchases)
- [ ] Offline purchases sync when back online
- [ ] Loading skeletons on key screens
- [ ] Empty states for all empty lists
- [ ] Toast notifications for success/error
- [ ] Pull-to-refresh on all list screens
- [ ] App feels polished and responsive
