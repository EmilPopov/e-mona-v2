# Phase 6: Analytics Dashboard & CSV Export

**Duration:** Days 33–40
**Goal:** Full analytics dashboard with charts showing spending patterns, category breakdowns, monthly trends, and per-member stats. CSV export for external analysis.

---

## Tasks

### Task 6.1: Analytics Composable
**What:** Transform raw purchase data into chart-ready datasets.

**Skills needed:** Data aggregation, array reduce/group operations, Chart.js data format
**AI strengths:** Data transformation logic is complex and error-prone. AI can generate correct aggregation functions (group by category, sum by date range, calculate percentages, month-over-month comparisons). This is one of the highest-value AI tasks in the project.
**Human strengths:** Verifying the numbers match reality. "I spent €400 on food — does the chart show €400?"
**Best collaboration:** AI writes all aggregation functions with unit tests. You verify with real data.

**File:** `src/composables/useAnalytics.ts`

**Functions:**
```typescript
// Returns data grouped by category for doughnut chart
function spendingByCategory(purchases: Purchase[]): CategorySpending[]
// Returns daily spending for bar chart
function dailySpending(purchases: Purchase[]): DailySpending[]
// Returns monthly totals for trend line chart
function monthlyTrend(months: BudgetMonth[]): MonthlyTrend[]
// Returns spending per member
function spendingByMember(purchases: Purchase[]): MemberSpending[]
// Returns top N items by total spending
function topItems(purchases: Purchase[], limit: number): ItemRanking[]
// Returns month-over-month comparison
function monthComparison(currentMonth: BudgetMonth, previousMonth: BudgetMonth): MonthComparison
```

**Verification:**
- [ ] Category totals sum to month's total purchases
- [ ] Daily spending matches actual purchase dates
- [ ] Member spending totals match when added up
- [ ] Top items are sorted correctly by total

---

### Task 6.2: Analytics Dashboard Page
**What:** Main analytics screen with multiple chart sections.

**Skills needed:** vue-chartjs, responsive layout, Ionic segments for tab switching
**AI strengths:** Chart.js configuration is verbose — AI generates correct options for each chart type (colors, legends, tooltips, responsive sizing).
**Human strengths:** Visual assessment — are the colors distinguishable? Are the charts readable on a phone screen? Do the proportions make sense?
**Best collaboration:** AI generates all charts. You review on mobile and iterate colors/sizes.

**File:** `src/views/analytics/AnalyticsDashboard.vue`

**Layout:**
```
┌───────────────────────────────┐
│  📊 Analytics    March 2026   │
│  [Overview] [Categories] [Trends]
│───────────────────────────────│
│                               │
│  Overview tab:                │
│                               │
│  Budget Health:               │
│  ┌─────────────────────────┐  │
│  │    🟢 €1,247 left       │  │
│  │    ████████░░░ 68%      │  │
│  │    15 days remaining    │  │
│  │    Daily avg: €39.97    │  │
│  │    Safe to spend: €83/d │  │
│  └─────────────────────────┘  │
│                               │
│  Spending by Category:        │
│  ┌─────────────────────────┐  │
│  │      [Doughnut Chart]   │  │
│  │   Food 45%  Car 20%     │  │
│  │   Fun 15%   Other 20%  │  │
│  └─────────────────────────┘  │
│                               │
│  Top Spending:                │
│  1. 🍽️ Food         €180    │
│  2. ⛽ Gas           €90     │
│  3. 🎉 Fun           €60     │
│                               │
│ [🏠] [🛒] [➕] [📊] [•••]    │
└───────────────────────────────┘
```

**Chart sections:**

**Overview tab:**
- Budget health gauge (remaining %, daily budget, safe-to-spend)
- Spending by category (doughnut chart)
- Top categories ranking

**Categories tab:**
- Horizontal bar chart (each category as a bar)
- Tap a category → shows items breakdown within that category

**Trends tab:**
- Monthly trend (last 6 months bar chart)
- Month-over-month comparison card

---

### Task 6.3: Spending by Category Chart (Doughnut)
**What:** Colorful doughnut chart showing spending distribution.

**Skills needed:** vue-chartjs Doughnut component, Chart.js options
**AI strengths:** Chart.js configuration with correct colors pulled from categories. Percentage labels on hover.
**Human strengths:** Are the category colors visible against each other?

**File:** `src/components/analytics/SpendingByCategory.vue`

**Chart.js config highlights:**
- Colors from category.color
- Center text showing total
- Legend at bottom
- Tooltip showing amount + percentage
- Responsive sizing

**Verification:**
- [ ] Each category slice has the correct color
- [ ] Percentages add up to 100%
- [ ] Tooltip shows "Food: €180 (45%)"
- [ ] Chart looks good on mobile

---

### Task 6.4: Monthly Trend Chart (Bar/Line)
**What:** Last 6 months of total spending as bars, with income as a reference line.

**Skills needed:** vue-chartjs Bar component with mixed chart types
**AI strengths:** Mixed chart (bar + line) configuration, date formatting on X axis
**Human strengths:** Choosing colors — spending bars vs. income line contrast

**File:** `src/components/analytics/MonthlyTrendChart.vue`

**Data source:** Load last 6 months' BudgetMonth documents.

**Verification:**
- [ ] Shows last 6 months (or fewer if app is new)
- [ ] Bar height matches total purchases for that month
- [ ] Income line is clearly distinct from spending bars
- [ ] X axis shows month names (Jan, Feb, Mar...)

---

### Task 6.5: Budget Health Card
**What:** Summary card showing budget health with actionable insight.

**File:** `src/components/analytics/BudgetHealthCard.vue`

**Calculations:**
```typescript
const daysRemaining = daysInMonth - currentDay;
const dailyAverage = totalPurchases / currentDay;
const safeToSpend = remainingBalance / daysRemaining;

// Color coding:
// Green: spent < 70% and on track
// Yellow: spent 70-90% or daily avg is high
// Red: spent > 90% or overspent
```

**Display:**
```
┌─────────────────────────────┐
│  🟢 On Track                │
│  €1,247 remaining           │
│  15 days left in March      │
│                             │
│  Daily average: €39.97      │
│  Safe to spend: €83.17/day  │
│                             │
│  At this rate, you'll end   │
│  the month with €447 left   │
└─────────────────────────────┘
```

**Verification:**
- [ ] Color changes based on spending rate
- [ ] "Safe to spend per day" is correct
- [ ] Projection at month end is reasonable
- [ ] Shows red when overspent

---

### Task 6.6: Per-Member Spending Breakdown
**What:** Show how much each family member has spent (visible only in shared budgets).

**File:** `src/components/analytics/MemberSpending.vue`

**Display:**
```
  Spending by Member:
  👤 Emil     €320   (54%)  ████████░░░░
  👤 Maria    €280   (46%)  ███████░░░░░
```

**Verification:**
- [ ] Only shows when budget has multiple members
- [ ] Totals sum to total purchases
- [ ] Hidden in single-user budgets

---

### Task 6.7: CSV Export
**What:** Export monthly spending data as CSV file.

**Skills needed:** CSV generation, file download/share
**AI strengths:** CSV formatting logic, Capacitor Filesystem plugin for saving on mobile, blob download for web. AI handles the platform differences.
**Human strengths:** Deciding CSV format — what columns? What date format? Test opening in Excel.
**Best collaboration:** AI generates the export function. You open the CSV in Excel and verify it's useful.

**Files:**
- `src/services/csv-export.service.ts`
- Button in Analytics page + Settings

**CSV format:**
```csv
Date,Purchase Note,Item,Category,Price,Quantity,Total,Added By
2026-03-26,Lidl shopping,Bread,Food,1.20,1,1.20,Emil
2026-03-26,Lidl shopping,Milk,Food,1.90,2,3.80,Emil
2026-03-26,Gas station,Fuel,Transport,45.00,1,45.00,Maria
```

**Export options:**
- Current month purchases (detailed)
- Monthly summary (one row per month: income, fixed, purchases, remaining)

**Platform handling:**
- **Web:** Download as blob → triggers browser download
- **Mobile (Capacitor):** Save to filesystem → share via system share sheet

**Verification:**
- [ ] CSV downloads/exports correctly
- [ ] Opens correctly in Excel/Google Sheets
- [ ] All purchases included with correct data
- [ ] Euro amounts formatted correctly (no cents issues)
- [ ] Date format is consistent

---

### Task 6.8: Month Selector Enhancement
**What:** Enhance the basic MonthSelector (created in Phase 3 Task 3.5) with a picker dropdown and wire it into the Analytics tab.

**Skills needed:** Date picker, Ionic modal/popover
**AI strengths:** Month picker dropdown component, historical data loading
**Human strengths:** Testing navigation between months, verifying data changes

**File:** `src/components/common/MonthSelector.vue` (already exists from Phase 3 — enhance it)

**Enhancements over Phase 3 version:**
- Tap month name → show picker with all available months (not just left/right arrows)
- Load data for selected month in Analytics tab
- Shared between Purchases tab and Analytics tab

**Verification:**
- [ ] Tap month name opens month picker
- [ ] Can navigate to previous months
- [ ] Data updates when month changes
- [ ] Cannot navigate to future months
- [ ] Works in both Purchases tab and Analytics tab

---

## Phase 6 Complete Checklist
- [ ] Analytics dashboard loads with real data
- [ ] Spending by category doughnut chart works
- [ ] Monthly trend chart shows last 6 months
- [ ] Budget health card with daily safe-to-spend
- [ ] Color coding (green/yellow/red) works correctly
- [ ] Per-member spending breakdown works
- [ ] Month selector navigates between months
- [ ] CSV export downloads correctly
- [ ] CSV opens in Excel with correct formatting
- [ ] Charts are readable on mobile screens
- [ ] All chart percentages and totals are mathematically correct
