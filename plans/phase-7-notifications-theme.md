# Phase 7: Push Notifications & Visual Theme

**Duration:** Days 41–46
**Goal:** Push notifications (daily reminder + budget alerts), polished colorful theme, app icon and splash screen.

---

## Tasks

### Task 7.1: Firebase Cloud Messaging (FCM) Setup
**What:** Configure push notifications for Android and iOS.

**Skills needed:** Firebase Console, Capacitor Push Notifications plugin, platform-specific config
**AI strengths:** The configuration steps for FCM + Capacitor are well-documented but complex. AI provides the exact steps in order. Also generates the notification permission request flow.
**Human strengths:** YOU must do the platform setup — Apple Developer certificates (iOS), Google Services JSON (Android). These require your accounts.
**Best collaboration:** AI writes a detailed step-by-step checklist. You execute each step. AI writes the code.

**Steps:**
1. **Android:** Download `google-services.json` from Firebase Console → place in `android/app/`
2. **iOS:** Create APNs key in Apple Developer → upload to Firebase Console → add `GoogleService-Info.plist` to iOS project
3. **App code:** Register for push notifications on first launch, save FCM token to user doc

**Files:**
- `src/services/notification.service.ts`
- `src/composables/useNotifications.ts`
- Update `src/stores/auth.store.ts` — save FCM token after login

**Permission request flow:**
```
After first login:
┌───────────────────────────────┐
│                               │
│  🔔 Stay on top of your      │
│     budget!                   │
│                               │
│  We'll remind you to log      │
│  expenses and alert you when  │
│  spending gets high.          │
│                               │
│  [Enable Notifications]       │
│  [Maybe Later]                │
│                               │
└───────────────────────────────┘
```

**Verification:**
- [ ] Permission prompt appears after first login
- [ ] FCM token saved to user's Firestore document
- [ ] Token refreshes handled (new token → update Firestore)
- [ ] Notification received when sent from Firebase Console (manual test)

---

### Task 7.2: Daily Expense Reminder (Cloud Function)
**What:** Scheduled Cloud Function that sends daily reminders at each user's preferred time.

**Skills needed:** Firebase Cloud Functions scheduled triggers, FCM admin SDK
**AI strengths:** Cloud Function scheduling with timezone handling. FCM message construction. AI generates the function that queries users who want reminders and sends notifications.
**Human strengths:** Testing the reminder — does it arrive at the right time? Is the message helpful?
**Best collaboration:** AI writes the Cloud Function. You test and tune the message.

**File:** `functions/src/scheduled/dailyReminder.ts`

**Logic:**
1. Scheduled function runs every hour (checks which timezone's "reminder time" it is)
2. Simpler approach for v1: run once daily at 20:00 UTC, send to all users with dailyReminder enabled
3. Query users where `notificationPrefs.dailyReminder == true`
4. For each user, check if they have purchases today
5. If no purchases today: "Don't forget to log today's expenses! 📝"
6. If purchases exist: "You've spent €42.50 today. Keep it up! 💰"

**Notification payload:**
```typescript
{
  notification: {
    title: "e-mona",
    body: "Don't forget to log today's expenses! 📝"
  },
  data: {
    type: "daily_reminder",
    click_action: "NEW_PURCHASE"  // Deep link to new purchase screen
  }
}
```

**Verification:**
- [ ] Function runs on schedule (test with emulator)
- [ ] Notification received on device
- [ ] Tapping notification opens the app (ideally to new purchase screen)
- [ ] Users with dailyReminder=false don't get notified

---

### Task 7.3: Budget Alert Notifications (Cloud Function)
**What:** Alert when spending reaches 80% of budget, and when overspent.

**File:** `functions/src/scheduled/budgetAlerts.ts` or use a Firestore trigger on month document updates

**Approach — Firestore trigger (better):**
When `month.totalPurchases` is updated (by the purchase Cloud Function), check:
- If totalPurchases > spendingBudget × 0.8 → send 80% warning (once per month)
- If totalPurchases > spendingBudget → send overspent alert (once per month)

**Track "already sent" alerts:**
Add to month document:
```
├── alerts: {
│     eightyPercentSent: boolean
│     overspentSent: boolean
│   }
```

**Messages:**
- 80%: "⚠️ You've used 80% of your March budget. €247 remaining."
- Overspent: "🔴 You've exceeded your March spending budget by €52."

**Verification:**
- [ ] 80% alert triggers when threshold crossed
- [ ] Overspent alert triggers when budget exceeded
- [ ] Each alert only sent once per month (not on every purchase after threshold)
- [ ] Alert goes to all budget members with budgetAlerts enabled

---

### Task 7.4: Notification Preferences Screen
**What:** User settings to control notification behavior.

**File:** `src/views/settings/NotificationSettings.vue`

**Screen:**
```
┌───────────────────────────────┐
│  🔔 Notifications             │
│───────────────────────────────│
│                               │
│  Daily Reminder    [toggle ✓] │
│  Remind me to log expenses    │
│                               │
│  Reminder Time     [20:00 ▼]  │
│                               │
│  Budget Alerts     [toggle ✓] │
│  Alert at 80% and overspent   │
│                               │
└───────────────────────────────┘
```

**Verification:**
- [ ] Toggles save to user's Firestore document
- [ ] Disabling daily reminder stops notifications
- [ ] Reminder time picker works

---

### Task 7.5: Colorful & Playful Theme
**What:** Transform the default Ionic look into a Revolut/Monzo-inspired colorful design.

**Skills needed:** CSS custom properties, Ionic theming, color theory
**AI strengths:** Generate a complete Ionic theme with CSS custom properties. Can suggest color palettes and generate gradient definitions. Knows which Ionic variables to override.
**Human strengths:** THIS IS YOUR CREATIVE MOMENT. Visual design is deeply human — you decide if it "feels right." Look at Revolut, Monzo, YNAB for inspiration. Screenshot what you like and iterate.
**Best collaboration:** AI generates a base theme. You review and say "more blue", "rounder corners", "bigger numbers." Multiple iterations. This task benefits most from back-and-forth collaboration.

**Files:**
- `src/theme/variables.css` — Ionic CSS custom properties
- `src/theme/global.css` — Global overrides, gradients, shadows
- `src/theme/colors.ts` — Programmatic palette (for charts, category defaults)

**Theme direction (Colorful & Playful):**
```css
:root {
  /* Primary: Warm purple/blue gradient */
  --ion-color-primary: #6C5CE7;
  --ion-color-secondary: #00CEC9;

  /* Background: Soft off-white, not harsh white */
  --ion-background-color: #F8F9FE;

  /* Cards: White with subtle shadow */
  --card-border-radius: 16px;
  --card-shadow: 0 2px 12px rgba(0,0,0,0.08);

  /* Balance number: Large, bold */
  --balance-font-size: 2.5rem;
  --balance-font-weight: 800;

  /* Category chips: Rounded with category color background */
  --chip-border-radius: 20px;
}
```

**Visual elements:**
- Gradient header on home screen
- Large, bold balance number
- Rounded cards with subtle shadows
- Colorful category chips/badges
- Smooth transitions between pages
- Custom tab bar with center FAB button styling

**Verification:**
- [ ] App doesn't look like default Ionic anymore
- [ ] Colors are consistent across all pages
- [ ] Text is readable (contrast ratios OK)
- [ ] Cards have rounded corners and shadows
- [ ] Balance number is large and prominent
- [ ] Tab bar with center FAB looks polished
- [ ] Feels cohesive and branded

---

### Task 7.6: App Icon & Splash Screen
**What:** Custom app icon and splash screen for app store listing.

**Skills needed:** Image design/generation, Capacitor assets
**AI strengths:** AI can help generate icon concepts and provide the exact sizes needed for iOS/Android. Can help with color/shape suggestions.
**Human strengths:** Final design approval — the icon represents your app on people's phones. This is a creative decision.
**Best collaboration:** AI suggests icon concepts and generates assets at correct sizes. You approve or iterate.

**Icon concept ideas:**
- Coin with "e" on it (e-mona = electronic money)
- Wallet/purse with a coin
- Simple "e" in a circle with gradient background
- Piggy bank with modern flat design

**Required sizes:**
- iOS: 1024×1024 (App Store) + various smaller sizes
- Android: 512×512 (Play Store) + adaptive icon layers

**Tools:**
- Use Capacitor's `@capacitor/assets` to auto-generate all sizes from one source image
- `npx capacitor-assets generate` — generates icons + splash from source files

**Verification:**
- [ ] Icon looks good at small sizes (on home screen)
- [ ] Splash screen matches app branding
- [ ] Icons generated for both iOS and Android

---

### Task 7.7: Dark Mode Support (Bonus)
**What:** Optional dark mode that respects system preference.

**This is a bonus task** — only if time allows. The primary theme is the colorful light theme.

**Ionic supports dark mode** via CSS media queries:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --ion-background-color: #1a1a2e;
    --ion-text-color: #ffffff;
    /* ... override all colors */
  }
}
```

**Verification:**
- [ ] Dark mode activates when system is in dark mode
- [ ] All text is readable
- [ ] Charts are visible in dark mode
- [ ] Category colors still distinguishable

---

## Phase 7 Complete Checklist
- [ ] FCM setup for Android (and iOS if applicable)
- [ ] Permission prompt shown after first login
- [ ] Daily expense reminder notification works
- [ ] Budget alert at 80% works
- [ ] Overspent alert works
- [ ] Notification preferences save correctly
- [ ] Colorful theme applied across all screens
- [ ] App icon designed and generated
- [ ] Splash screen matches branding
- [ ] App feels polished and branded
- [ ] All screens reviewed for visual consistency
