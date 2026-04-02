<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Analytics</ion-title>
        <ion-note slot="end" class="month-label">{{ monthLabel }}</ion-note>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="activeTab">
          <ion-segment-button value="overview">
            <ion-label>Overview</ion-label>
          </ion-segment-button>
          <ion-segment-button value="categories">
            <ion-label>Categories</ion-label>
          </ion-segment-button>
          <ion-segment-button value="trends">
            <ion-label>Trends</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Overview Tab -->
      <template v-if="activeTab === 'overview'">
        <BudgetHealthCard :health="health" />
        <SpendingByCategory :data="categoryBreakdown" />
        <MemberSpending :data="memberBreakdown" />

        <!-- Top Items -->
        <div v-if="topItemsList.length > 0" class="chart-card">
          <h3>Top Spending Items</h3>
          <div v-for="(item, idx) in topItemsList.slice(0, 5)" :key="item.name" class="top-item">
            <span class="top-rank">{{ idx + 1 }}</span>
            <span class="top-dot" :style="{ backgroundColor: item.categoryColor }" />
            <span class="top-name">{{ item.name }}</span>
            <span class="top-amount">{{ format(item.total) }}</span>
          </div>
        </div>
      </template>

      <!-- Categories Tab -->
      <template v-if="activeTab === 'categories'">
        <SpendingByCategory :data="categoryBreakdown" />

        <!-- Category detail bars -->
        <div v-if="categoryBreakdown.length > 0" class="chart-card">
          <h3>Category Breakdown</h3>
          <div v-for="cat in categoryBreakdown" :key="cat.categoryId" class="cat-bar-row">
            <div class="cat-bar-label">
              <span class="cat-dot" :style="{ backgroundColor: cat.categoryColor }" />
              <span>{{ cat.categoryName }}</span>
            </div>
            <div class="cat-bar-wrapper">
              <div
                class="cat-bar"
                :style="{
                  width: maxCategoryTotal > 0 ? (cat.total / maxCategoryTotal * 100) + '%' : '0%',
                  backgroundColor: cat.categoryColor,
                }"
              />
            </div>
            <span class="cat-bar-amount">{{ format(cat.total) }}</span>
          </div>
        </div>
      </template>

      <!-- Trends Tab -->
      <template v-if="activeTab === 'trends'">
        <MonthlyTrendChart :data="trendData" />

        <!-- Month comparison -->
        <div v-if="trendData.length >= 2" class="chart-card">
          <h3>Month-over-Month</h3>
          <div class="comparison">
            <div class="comp-row">
              <span>This month</span>
              <strong>{{ format(currentMonthTotal) }}</strong>
            </div>
            <div class="comp-row">
              <span>Last month</span>
              <strong>{{ format(previousMonthTotal) }}</strong>
            </div>
            <div class="comp-row" :class="diffClass">
              <span>Difference</span>
              <strong>{{ diffSign }}{{ format(Math.abs(monthDiff)) }}</strong>
            </div>
          </div>
        </div>

        <!-- Export button -->
        <ion-button
          expand="block"
          fill="outline"
          class="ion-margin-top"
          @click="handleExport"
          :disabled="exporting"
        >
          <ion-spinner v-if="exporting" name="crescent" slot="start" />
          <ion-icon v-else :icon="downloadOutline" slot="start" />
          Export CSV
        </ion-button>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonNote, IonSegment, IonSegmentButton, IonLabel,
  IonButton, IonIcon, IonSpinner,
} from '@ionic/vue';
import { downloadOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { usePurchasesStore } from '@/stores/purchases.store';
import { useCurrency } from '@/composables/useCurrency';
import { useAnalytics, monthlyTrend, type MonthlyTrend } from '@/composables/useAnalytics';
import { exportPurchasesCsv } from '@/services/csv-export.service';
import * as monthService from '@/services/month.service';
import { isOk } from '@/types/result';
import type { BudgetMonth } from '@/types/types';

import BudgetHealthCard from '@/components/analytics/BudgetHealthCard.vue';
import SpendingByCategory from '@/components/analytics/SpendingByCategory.vue';
import MonthlyTrendChart from '@/components/analytics/MonthlyTrendChart.vue';
import MemberSpending from '@/components/analytics/MemberSpending.vue';

const budgetStore = useBudgetStore();
const purchasesStore = usePurchasesStore();
const { format } = useCurrency();
const { categoryBreakdown, memberBreakdown, topItemsList, health } = useAnalytics();

const activeTab = ref('overview');
const trendData = ref<MonthlyTrend[]>([]);
const exporting = ref(false);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthLabel = computed(() => {
  const m = budgetStore.currentMonth;
  if (!m) return '';
  return `${MONTH_NAMES[m.month - 1]} ${String(m.year).slice(2)}`;
});

const maxCategoryTotal = computed(() => {
  if (categoryBreakdown.value.length === 0) return 0;
  return categoryBreakdown.value[0].total;
});

// Trend comparison
const currentMonthTotal = computed(() => {
  if (trendData.value.length === 0) return 0;
  return trendData.value[trendData.value.length - 1].totalPurchases;
});

const previousMonthTotal = computed(() => {
  if (trendData.value.length < 2) return 0;
  return trendData.value[trendData.value.length - 2].totalPurchases;
});

const monthDiff = computed(() => currentMonthTotal.value - previousMonthTotal.value);
const diffSign = computed(() => (monthDiff.value > 0 ? '+' : monthDiff.value < 0 ? '-' : ''));
const diffClass = computed(() => (monthDiff.value > 0 ? 'diff-up' : monthDiff.value < 0 ? 'diff-down' : ''));

// Load last 6 months for trend chart
onMounted(async () => {
  const budgetId = budgetStore.budget?.id;
  if (!budgetId) return;

  const months: BudgetMonth[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  for (let i = 0; i < 6; i++) {
    const monthId = `${year}-${String(month).padStart(2, '0')}`;
    const result = await monthService.getMonth(budgetId, monthId);
    if (isOk(result) && result.data) {
      months.push(result.data);
    }
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
  }

  trendData.value = monthlyTrend(months);
});

async function handleExport() {
  exporting.value = true;
  const currency = budgetStore.budget?.currency ?? 'EUR';
  await exportPurchasesCsv(purchasesStore.purchases, currency);
  exporting.value = false;
}
</script>

<style scoped>
.month-label {
  padding-right: 16px;
  font-size: 0.9em;
}

.chart-card {
  background: var(--ion-card-background, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart-card h3 {
  margin: 0 0 12px;
  font-size: 1em;
  font-weight: 600;
}

/* Top items */
.top-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.top-rank {
  width: 20px;
  font-weight: 700;
  color: var(--ion-color-medium);
  text-align: center;
}

.top-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.top-name {
  flex: 1;
  font-size: 0.9em;
}

.top-amount {
  font-weight: 600;
  font-size: 0.9em;
}

/* Category bars */
.cat-bar-row {
  margin-bottom: 10px;
}

.cat-bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  margin-bottom: 4px;
}

.cat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-bar-wrapper {
  height: 8px;
  background: var(--ion-color-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 2px;
}

.cat-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.cat-bar-amount {
  font-size: 0.8em;
  font-weight: 600;
}

/* Comparison */
.comparison {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comp-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.95em;
}

.diff-up {
  color: var(--ion-color-danger);
}

.diff-down {
  color: var(--ion-color-success);
}
</style>
