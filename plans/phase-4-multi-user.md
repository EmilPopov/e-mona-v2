# Phase 4: Multi-User & Invitations

**Duration:** Days 21–26
**Goal:** Admin can invite family members via a 6-digit code. Members join the shared budget, can create purchases, and everyone sees who added what.

---

## Firestore Schema for This Phase

```
invitations/{invitationId}
  ├── code: string                   # 6-digit code "A3K9F2"
  ├── budgetId: string
  ├── budgetName: string             # Denormalized for display
  ├── role: "member"                 # What role the invitee gets
  ├── createdBy: string              # Admin who created the invite
  ├── createdByName: string
  ├── status: "active" | "used" | "expired"
  ├── usedBy: string | null          # userId who redeemed it
  ├── createdAt: Timestamp
  └── expiresAt: Timestamp           # createdAt + 24 hours

budgets/{budgetId}
  ├── memberIds: string[]            # Updated when member joins
  └── members: {                     # Updated when member joins
        [userId]: { role, displayName, email, joinedAt }
      }
```

---

## Tasks

### Task 4.1: Invitation Service
**What:** Generate invite codes, validate them, and join members to budgets.

**Skills needed:** Firestore queries, transactions, random code generation
**AI strengths:** The join-budget transaction is complex (validate code → check not expired → check not used → add member to budget → update invitation status → update user's activeBudgetId). AI handles multi-step transactions well. Code generation with collision avoidance.
**Human strengths:** Testing the flow end-to-end with two accounts. Edge cases: what if the code is wrong? Expired? Already used?
**Best collaboration:** AI writes the service with all validation. You test with two browser tabs (one admin, one member).

**File:** `src/services/invitation.service.ts`

**Functions:**
- `createInvitation(budgetId, budgetName, adminUserId, adminName)` → Generates 6-digit code, creates invitation doc
- `validateCode(code)` → Checks if code exists, is active, and not expired
- `redeemCode(code, userId, displayName, email)` → Transaction: join budget + mark code used
- `getActiveInvitations(budgetId)` → List active invites for admin view

**Code generation:**
```typescript
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

**Verification:**
- [ ] Code generates as 6 uppercase alphanumeric characters
- [ ] Code is unique (check for collision)
- [ ] Invalid code shows error
- [ ] Expired code (>24h) shows error
- [ ] Already-used code shows error
- [ ] Valid code joins user to budget

---

### Task 4.2: Members Store (Pinia)
**What:** Track budget members and their roles.

**File:** `src/stores/members.store.ts`

**State:**
- `members: BudgetMember[]`
- `currentUserRole: UserRole` — computed from members + auth
- `isAdmin: boolean` — computed convenience

**These are used throughout the app** to show/hide admin-only features.

---

### Task 4.3: Invite Code Generation Screen (Admin)
**What:** Admin generates a code and shares it with the family member.

**Skills needed:** Ionic modals/sheets, clipboard API
**AI strengths:** The UI for code display with copy/share functionality. Ionic action sheet patterns.
**Human strengths:** Testing the share flow — can you actually send this code via WhatsApp?
**Best collaboration:** AI builds the screen. You test sharing.

**File:** `src/components/members/InviteModal.vue`

**Screen:**
```
┌───────────────────────────────┐
│                               │
│   Invite Family Member        │
│                               │
│   Share this code:            │
│                               │
│   ┌─────────────────────┐     │
│   │     A 3 K 9 F 2     │     │
│   └─────────────────────┘     │
│                               │
│   Expires in 24 hours         │
│                               │
│   [📋 Copy Code]              │
│   [📤 Share...]               │
│                               │
│   [Close]                     │
└───────────────────────────────┘
```

**Share options:**
- Copy to clipboard (Capacitor Clipboard plugin or navigator.clipboard)
- Share via system share sheet (Capacitor Share plugin) — works on mobile to share via WhatsApp, SMS, etc.

**Verification:**
- [ ] Code displays clearly with large font
- [ ] Copy to clipboard works
- [ ] Share sheet opens on mobile
- [ ] Code matches what's in Firestore

---

### Task 4.4: Join Budget Screen (Member)
**What:** New user enters the invite code to join a shared budget.

**Skills needed:** Form input, code validation UX
**AI strengths:** Auto-uppercase, auto-format, validation feedback
**Human strengths:** Testing the flow: register as new user → enter code → see shared budget
**Best collaboration:** AI builds it. You test the full registration→join flow.

**File:** `src/views/budget/JoinBudgetPage.vue`

**This page appears when:**
- User is logged in but has no `activeBudgetId`
- Instead of the budget setup wizard, they see: "Create new budget" OR "Join existing budget with code"

**Screen:**
```
┌───────────────────────────────┐
│                               │
│   Welcome to e-mona! 🪙       │
│                               │
│   [Create new budget]         │
│        - or -                 │
│   Join a family budget:       │
│                               │
│   Enter invite code:          │
│   [A] [3] [K] [9] [F] [2]    │
│                               │
│   ✅ "Popov Family Budget"    │
│   Invited by Emil             │
│                               │
│   [Join Budget]               │
│                               │
└───────────────────────────────┘
```

**UX details:**
- 6 individual input boxes for each character (like OTP input)
- Auto-validates after all 6 entered → shows budget name preview
- "Join Budget" button appears only after validation passes

**Verification:**
- [ ] 6-digit input works smoothly
- [ ] Auto-uppercase
- [ ] Valid code shows budget name preview
- [ ] Invalid code shows error
- [ ] Joining sets user's activeBudgetId
- [ ] User sees the shared budget dashboard after joining

---

### Task 4.5: Members Management Page (Admin)
**What:** Admin views all members, their roles, and can manage invitations.

**File:** `src/views/members/MembersPage.vue`

**Screen:**
```
┌───────────────────────────────┐
│  👥 Members                   │
│───────────────────────────────│
│                               │
│  👤 Emil Popov       Admin    │
│     emil@email.com            │
│     Joined Jan 2026           │
│                               │
│  👤 Maria Popova     Member   │
│     maria@email.com           │
│     Joined Feb 2026           │
│                               │
│  ────────────────────         │
│  Active Invitations:          │
│  📧 Code: B7M2X4             │
│     Created 2h ago            │
│     Expires in 22h            │
│                               │
│  [+ Invite New Member]        │
│                               │
└───────────────────────────────┘
```

**Admin actions:**
- Invite new member (opens InviteModal)
- Remove member (with confirmation — deletes from budget.members and budget.memberIds)
- View active/expired invitations

**Verification:**
- [ ] All members listed with roles
- [ ] Admin can create new invitation
- [ ] Admin can remove a member
- [ ] Active invitations shown with expiry countdown
- [ ] Member role users cannot see invite/remove buttons

---

### Task 4.6: Role-Based UI Throughout the App
**What:** Hide admin-only features from members.

**Skills needed:** Conditional rendering with v-if
**AI strengths:** Systematically finding all places where role-based visibility is needed
**Human strengths:** Deciding the exact boundary — what can a member do vs. not?
**Best collaboration:** Review together which features are admin-only.

**Admin-only features (hide from members):**
- Budget setup editing (name, currency)
- Category management (add/edit/delete)
- Fixed costs management
- Yearly goals management
- Member management & invitations
- Confirm new month
- Delete other people's purchases
- Income editing

**Member capabilities:**
- View dashboard + all data
- Create purchases
- Edit/delete their OWN purchases
- View purchase history and analytics
- View categories (but not edit)
- View members list (but not manage)

**Implementation pattern:**
```vue
<template>
  <!-- In any component -->
  <ion-button v-if="isAdmin" @click="editCategory">Edit</ion-button>
</template>

<script setup>
const membersStore = useMembersStore();
const isAdmin = computed(() => membersStore.isAdmin);
</script>
```

**Verification:**
- [ ] Member cannot see "Edit" on categories
- [ ] Member cannot see "Manage Members"
- [ ] Member cannot see "Edit Budget"
- [ ] Member CAN create purchases
- [ ] Member CAN edit their own purchases
- [ ] Admin sees all controls

---

### Task 4.7: Attribution on Purchases
**What:** Show who created each purchase throughout the app.

**Updates to:**
- `PurchaseCard.vue` — show avatar + name: "👤 Emil"
- `PurchaseDetailPage.vue` — show full attribution
- `RecentPurchasesList.vue` (dashboard) — show who added it

**Avatar approach:**
Each user has an `avatarColor` (assigned at registration). The avatar is the user's initials on a colored circle.

**File:** `src/components/common/AvatarBadge.vue`
```
┌────┐
│ EP │  ← Emil Popov, blue background
└────┘
```

**Verification:**
- [ ] Each purchase shows who created it
- [ ] Avatar colors are distinct per user
- [ ] Works with 2+ users in the same budget

---

### Task 4.8: Security Rules (Multi-User)
**What:** Update rules for the invitation and member join flow.

**Rules:**
```
invitations/{invitationId}:
  - create: authenticated (via callable function is safer, but direct works for v1)
  - read: code matches query (for validation)
  - update: authenticated user can update status to "used"

budgets/{budgetId}:
  - memberIds and members fields: only admin can add/remove
  - Exception: joining via valid invitation (handled by service with transaction)
```

**Note:** The invitation redemption uses a Firestore transaction in the client service. This is acceptable for v1. For production hardening, this could be moved to a Cloud Function callable.

**Verification:**
- [ ] Non-member cannot read a budget
- [ ] Member can read but not modify budget settings
- [ ] Invitation code lookup works for any authenticated user
- [ ] Only the code holder can redeem it

---

## Phase 4 Complete Checklist
- [ ] Invite code generation works (6-digit, 24h expiry)
- [ ] Code sharing works (copy + system share)
- [ ] New user can join budget via code
- [ ] Member sees shared budget dashboard
- [ ] Purchases show "added by" attribution
- [ ] Admin-only features hidden from members
- [ ] Member can create/edit their own purchases
- [ ] Members page shows all users with roles
- [ ] Admin can remove members
- [ ] Security rules enforce roles
- [ ] Tested with 2 accounts in different browser tabs
