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
      <DashboardSkeleton v-if="budgetStore.loading" />

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
  IonNote, IonButton, IonIcon,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue';
import type { RefresherCustomEvent } from '@ionic/vue';
import { alertCircleOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import { useMonthFormat } from '@/composables/useMonthFormat';
import BudgetSummaryCard from '@/components/budget/BudgetSummaryCard.vue';
import BudgetBreakdown from '@/components/budget/BudgetBreakdown.vue';
import RecentPurchasesList from '@/components/budget/RecentPurchasesList.vue';
import DashboardSkeleton from '@/components/common/DashboardSkeleton.vue';

const budgetStore = useBudgetStore();
const authStore = useAuthStore();
const { monthLabel } = useMonthFormat();

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
