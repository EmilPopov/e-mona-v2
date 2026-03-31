<template>
  <ion-list lines="none" class="breakdown-list">
    <ion-item>
      <ion-label>Income</ion-label>
      <ion-note slot="end" class="positive">{{ format(totalIncome) }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>Fixed Costs</ion-label>
      <ion-note slot="end" class="negative">-{{ format(totalFixedCosts) }}</ion-note>
    </ion-item>
    <ion-item>
      <ion-label>Goal Savings</ion-label>
      <ion-note slot="end" class="negative">-{{ format(totalGoalDeductions) }}</ion-note>
    </ion-item>
    <ion-item v-if="rolloverAmount > 0">
      <ion-label>Rollover</ion-label>
      <ion-note slot="end" class="positive">+{{ format(rolloverAmount) }}</ion-note>
    </ion-item>
    <ion-item v-if="totalPurchases > 0">
      <ion-label>Purchases</ion-label>
      <ion-note slot="end" class="negative">-{{ format(totalPurchases) }}</ion-note>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonList, IonItem, IonLabel, IonNote } from '@ionic/vue';
import { useBudgetStore } from '@/stores/budget.store';
import { useCurrency } from '@/composables/useCurrency';

const budgetStore = useBudgetStore();
const { format } = useCurrency();

const totalIncome = computed(() => budgetStore.currentMonth?.totalIncome ?? 0);
const totalFixedCosts = computed(() => budgetStore.currentMonth?.totalFixedCosts ?? 0);
const totalGoalDeductions = computed(() => budgetStore.currentMonth?.totalGoalDeductions ?? 0);
const rolloverAmount = computed(() => budgetStore.currentMonth?.rolloverAmount ?? 0);
const totalPurchases = computed(() => budgetStore.currentMonth?.totalPurchases ?? 0);
</script>

<style scoped>
.breakdown-list {
  margin: 0 16px;
  border-radius: 12px;
  overflow: hidden;
}

.positive {
  color: var(--ion-color-success) !important;
  font-weight: 600;
  font-size: 1em !important;
}

.negative {
  color: var(--ion-color-danger) !important;
  font-weight: 600;
  font-size: 1em !important;
}
</style>
