<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>e-mona</ion-title>
        <ion-note slot="end" class="month-label">{{ monthLabel }}</ion-note>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading state -->
      <div v-if="budgetStore.loading" class="loading-state">
        <ion-spinner name="crescent" />
      </div>

      <!-- Error state -->
      <div v-else-if="budgetStore.error" class="error-state">
        <ion-icon :icon="alertCircleOutline" class="error-icon" />
        <p>{{ budgetStore.error }}</p>
        <ion-button @click="retry">Retry</ion-button>
      </div>

      <!-- Dashboard -->
      <template v-else>
        <BudgetSummaryCard />
        <BudgetBreakdown />
        <RecentPurchasesList />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonNote, IonSpinner, IonButton, IonIcon,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue';
import type { RefresherCustomEvent } from '@ionic/vue';
import { alertCircleOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import BudgetSummaryCard from '@/components/budget/BudgetSummaryCard.vue';
import BudgetBreakdown from '@/components/budget/BudgetBreakdown.vue';
import RecentPurchasesList from '@/components/budget/RecentPurchasesList.vue';

const budgetStore = useBudgetStore();
const authStore = useAuthStore();

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthLabel = computed(() => {
  const m = budgetStore.currentMonth;
  if (!m) return '';
  return `${MONTH_NAMES[m.month - 1]} ${String(m.year).slice(2)}`;
});

async function handleRefresh(event: RefresherCustomEvent) {
  const budgetId = authStore.user?.activeBudgetId;
  if (budgetId) {
    await budgetStore.loadBudget(budgetId);
  }
  event.detail.complete();
}

async function retry() {
  const budgetId = authStore.user?.activeBudgetId;
  if (budgetId) {
    await budgetStore.loadBudget(budgetId);
  }
}
</script>

<style scoped>
.month-label {
  padding-right: 16px;
  font-size: 0.9em;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 80px;
}

.error-icon {
  font-size: 3em;
  color: var(--ion-color-danger);
  margin-bottom: 12px;
}
</style>
