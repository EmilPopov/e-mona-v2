# Phase 8: Testing, Security & App Store Launch

**Duration:** Days 47–54
**Goal:** Comprehensive testing, security hardening, performance optimization, and app store submission.

---

## Tasks

### Task 8.1: Unit Tests — Services
**What:** Test all Firestore services with mocked Firebase.

**Skills needed:** Vitest, mocking Firebase SDK
**AI strengths:** Generating test suites with proper mocks. AI can write comprehensive test cases that cover edge cases you might miss. Test setup/teardown for Firebase emulator.
**Human strengths:** Identifying which tests matter most — focus on the money math (purchase totals, budget calculations).
**Best collaboration:** AI generates full test suites. You review and add any missing cases.

**Files:**
- `tests/unit/services/auth.service.test.ts`
- `tests/unit/services/budget.service.test.ts`
- `tests/unit/services/purchase.service.test.ts`
- `tests/unit/services/invitation.service.test.ts`

**Priority tests (money-critical):**
- Purchase total calculation: sum of (price × qty) for all items
- Budget math: income - fixed costs - goals = spending budget
- Remaining balance: spending budget + rollover - purchases
- Currency conversion: cents ↔ display amounts

**Test pattern:**
```typescript
import { describe, it, expect } from 'vitest';

describe('Purchase total calculation', () => {
  it('calculates total from items correctly', () => {
    const items = [
      { price: 120, quantity: 1 },  // €1.20
      { price: 190, quantity: 2 },  // €3.80
      { price: 430, quantity: 1 },  // €4.30
    ];
    const total = calculateTotal(items);
    expect(total).toBe(920); // €9.20 in cents
  });

  it('handles empty items array', () => {
    expect(calculateTotal([])).toBe(0);
  });
});
```

**Verification:**
- [ ] All service tests pass
- [ ] Budget math tests cover all formulas
- [ ] Currency rounding tests pass
- [ ] Tests run in CI (GitHub Actions)

---

### Task 8.2: Unit Tests — Stores & Composables
**What:** Test Pinia stores and composables with mocked services.

**Files:**
- `tests/unit/stores/budget.store.test.ts`
- `tests/unit/stores/purchases.store.test.ts`
- `tests/unit/composables/useCurrency.test.ts`
- `tests/unit/composables/useAnalytics.test.ts`

**Focus on:**
- Budget store computed properties (remainingBalance, spentPercentage)
- Analytics aggregation functions (groupByCategory, monthlyTrend)
- Currency formatting (€1,247.50 format, rounding)

**Verification:**
- [ ] All store computed values tested
- [ ] Analytics aggregation tested with sample data
- [ ] Currency edge cases tested (0, negative, large numbers)

---

### Task 8.3: Security Rules — Final Audit & Edge Cases
**What:** Security rules tests have been built incrementally since Phase 1 (user rules), Phase 2 (budget rules), Phase 3 (purchase rules), and Phase 4 (invitation rules). This task is the **final adversarial audit** — add edge cases and attack scenarios that weren't covered during feature development.

**Skills needed:** Adversarial thinking, Firebase emulator
**AI strengths:** Generating attack scenarios and edge cases systematically.
**Human strengths:** Thinking like an attacker — "what if a member tries to escalate their role to admin?"
**Best collaboration:** AI generates adversarial test cases. You review and add scenarios.

**File:** `tests/security/firestore.rules.test.ts` (extend existing tests)

**Additional edge case tests to add:**
```
❌ Member cannot set their own role to "admin" in budget.members map
❌ Member cannot add themselves to memberIds[] of a budget they don't belong to
❌ User cannot create a purchase with createdBy set to another user's ID
❌ User cannot modify totalPurchases directly on a month document (only Cloud Functions should)
❌ Expired invitation cannot be redeemed
❌ Already-used invitation cannot be redeemed again
❌ Non-member cannot read purchases even with a direct document path
❌ Member cannot delete the budget itself (only admin)
```

**Verification:**
- [ ] All security rule tests pass (existing + new edge cases)
- [ ] No false positives (legitimate access blocked)
- [ ] No false negatives (unauthorized access allowed)
- [ ] Rules prevent role escalation attacks

---

### Task 8.4: E2E Tests — Critical Flows
**What:** End-to-end tests for the most important user journeys.

**Skills needed:** Cypress or Playwright, testing patterns
**AI strengths:** E2E test setup and writing test scripts for user flows. AI generates realistic test data.
**Human strengths:** Defining which flows are "critical" — what breaks if this doesn't work?
**Best collaboration:** AI writes the tests. You run them and fix any flaky issues.

**Tool:** Cypress (good Ionic support) or Playwright

**Critical flows to test:**
1. **Register → Create Budget → See Dashboard**
2. **Login → Create Purchase (3 items) → See balance update**
3. **Generate New Month → Review → Confirm**
4. **Generate Invite Code → Join Budget (different user) → See shared data**

**Files:**
- `tests/e2e/auth.spec.ts`
- `tests/e2e/purchase-flow.spec.ts`
- `tests/e2e/budget-month.spec.ts`
- `tests/e2e/invitation.spec.ts`

**Verification:**
- [ ] All E2E tests pass against emulator
- [ ] Tests can run in CI
- [ ] No flaky tests

---

### Task 8.5: Performance Optimization
**What:** Audit and optimize bundle size, Firestore reads, and rendering.

**Skills needed:** Chrome DevTools, Lighthouse, Vite build analysis
**AI strengths:** Identifying common performance issues in Vue + Firebase apps. Generating optimized Firestore query patterns.
**Human strengths:** Running the audit tools and measuring real performance on your phone.
**Best collaboration:** AI provides the optimization checklist. You measure before/after.

**Optimization checklist:**

**Bundle size:**
- [ ] Run `npx vite-bundle-visualizer` — identify large chunks
- [ ] Lazy load routes (dynamic imports)
- [ ] Tree-shake unused Ionicons (import only used icons)
- [ ] Ensure Chart.js is tree-shaken (register only used chart types)

**Firestore reads:**
- [ ] Dashboard loads with minimal reads (1 budget + 1 month doc)
- [ ] Purchase list uses pagination (not loading all purchases at once)
- [ ] Analytics loads data on demand (only when tab is opened)
- [ ] Real-time listeners are scoped (not listening to entire collections)

**Rendering:**
- [ ] Large lists use virtual scroll (`ion-virtual-scroll` or `@vueuse/core useVirtualList`)
- [ ] Images/icons are optimized
- [ ] No unnecessary re-renders (check with Vue DevTools)

**Target metrics:**
- Initial load: < 3 seconds on 3G
- Bundle size: < 500KB gzipped (excluding Firebase SDK)
- Dashboard render: < 1 second with cached data

**Verification:**
- [ ] Lighthouse performance score > 80
- [ ] No excessive Firestore reads on dashboard load
- [ ] App feels fast on a mid-range Android phone

---

### Task 8.6: Security Hardening
**What:** Final security review before public release.

**Skills needed:** Security awareness, Firebase security best practices
**AI strengths:** Security audit checklist for Firebase apps — AI knows the common vulnerabilities.
**Human strengths:** Final review and sign-off. Are you comfortable with the security?
**Best collaboration:** AI provides the checklist. You verify each item.

**Checklist:**
- [ ] All Firestore security rules tested and deployed
- [ ] No Firebase config secrets in the codebase (API keys are OK — they're not secret for Firebase)
- [ ] Auth persistence is secure (indexedDB, not localStorage)
- [ ] No console.log statements left in production build
- [ ] Input validation on all user-facing forms (XSS prevention)
- [ ] Currency amounts stored as integers (no floating-point manipulation attacks)
- [ ] Rate limiting on invitation code validation (prevent brute force)
- [ ] Firestore rules prevent users from setting their own role to "admin"
- [ ] Cloud Functions validate all inputs
- [ ] CORS configured correctly on Cloud Functions

---

### Task 8.7: App Store Assets
**What:** Prepare everything needed for Play Store and App Store listings.

**Skills needed:** Graphic design, copywriting, screenshot tools
**AI strengths:** Generate app descriptions, keyword suggestions, feature list copy. AI can help with the text content.
**Human strengths:** Screenshots (you need to take them on real devices), final visual review, pricing decisions.
**Best collaboration:** AI writes the listing text. You create screenshots and make final decisions.

**Required assets:**

**Google Play Store:**
- App icon: 512×512 PNG
- Feature graphic: 1024×500 PNG
- Screenshots: minimum 2, recommended 8 (phone + tablet)
- Short description: max 80 characters
- Full description: max 4000 characters
- Category: Finance
- Privacy policy URL

**Apple App Store:**
- App icon: 1024×1024 PNG
- Screenshots: 6.7", 6.5", 5.5" sizes
- App name: max 30 characters
- Subtitle: max 30 characters
- Description: max 4000 characters
- Keywords: max 100 characters
- Privacy policy URL

**AI-generated copy (draft):**
```
App Name: e-mona
Subtitle: Family Budget Manager

Short description:
Track spending, manage family budgets, and reach savings goals together.

Full description:
e-mona helps families and individuals take control of their money.

✅ Shared family budgets — everyone logs expenses, together
✅ Quick purchase logging — favorites for one-tap entry
✅ Fixed costs & savings goals — auto-deducted monthly
✅ Beautiful analytics — see where your money goes
✅ Works offline — log expenses anywhere, sync later
✅ Daily reminders — never forget to log
✅ CSV export — for your records

Simple. Colorful. Effective.
```

**Verification:**
- [ ] All required assets created
- [ ] Screenshots show the app's best features
- [ ] Description is clear and compelling
- [ ] Privacy policy hosted and accessible

---

### Task 8.8: Privacy Policy & Terms
**What:** Required legal documents for app store submission.

**Skills needed:** Legal awareness (not legal advice)
**AI strengths:** Generate a privacy policy template covering Firebase data collection, analytics, push notifications. This is a common template — AI generates a solid starting point.
**Human strengths:** YOU must review and ensure it's accurate for your specific app. Consider consulting a legal professional for your jurisdiction.
**Best collaboration:** AI generates the template. You review and customize.

**Privacy policy should cover:**
- What data is collected (email, display name, financial data)
- How it's stored (Firebase/Google Cloud)
- Third-party services (Firebase Auth, Firestore, FCM)
- Data retention and deletion
- User rights (GDPR if serving EU users)
- Contact information

**Verification:**
- [ ] Privacy policy hosted at a public URL
- [ ] Covers all data the app collects
- [ ] GDPR-aware (you're in the EU)

---

### Task 8.9: Build & Submit
**What:** Create production builds and submit to stores.

**Skills needed:** Build tools, app store submission process
**AI strengths:** Build commands, troubleshooting build errors. Step-by-step submission guide.
**Human strengths:** YOU must have developer accounts (Google Play: $25 one-time, Apple: $99/year). You sign the builds and submit.
**Best collaboration:** AI provides the build commands and submission checklist. You execute.

**Build commands:**
```bash
# Build web assets
npm run build

# Sync to native projects
npx cap sync

# Android: Open in Android Studio for signing and building APK/AAB
npx cap open android

# iOS: Open in Xcode for signing and archiving
npx cap open ios
```

**Android submission steps:**
1. Create signed AAB in Android Studio
2. Create Google Play Console listing
3. Upload AAB
4. Fill in store listing (description, screenshots, etc.)
5. Submit for review

**iOS submission steps:**
1. Archive in Xcode
2. Upload to App Store Connect
3. Fill in App Store listing
4. Submit for review

**Verification:**
- [ ] Android AAB builds without errors
- [ ] iOS archive builds without errors
- [ ] App submitted to Google Play
- [ ] App submitted to App Store (if applicable)
- [ ] Both listings have all required information

---

### Task 8.10: GitHub Actions CI
**What:** Automated testing on push.

**File:** `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

**Verification:**
- [ ] CI runs on push
- [ ] Tests pass in CI
- [ ] Build succeeds in CI

---

## Phase 8 Complete Checklist
- [ ] Unit tests: services, stores, composables (all pass)
- [ ] Security rules tests (all pass)
- [ ] E2E tests for critical flows (all pass)
- [ ] Performance audit done (Lighthouse > 80)
- [ ] Security hardening checklist complete
- [ ] App store assets ready
- [ ] Privacy policy hosted
- [ ] Production builds created
- [ ] App submitted to at least Google Play
- [ ] CI pipeline running
- [ ] 🎉 YOU SHIPPED AN APP! 🎉
