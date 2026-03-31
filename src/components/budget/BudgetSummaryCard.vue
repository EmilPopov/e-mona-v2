<template>
  <ion-card class="summary-card">
    <ion-card-content>
      <div class="balance-label">Remaining</div>
      <div class="balance-amount" :class="balanceColor">
        {{ format(remainingBalance) }}
      </div>
      <ion-progress-bar
        :value="progressValue"
        :color="progressColor"
        class="spending-bar"
      />
      <div class="progress-label">{{ spentPercentage }}% spent</div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonCard, IonCardContent, IonProgressBar } from '@ionic/vue';
import { useBudgetStore } from '@/stores/budget.store';
import { useCurrency } from '@/composables/useCurrency';

const budgetStore = useBudgetStore();
const { format } = useCurrency();

const remainingBalance = computed(() => budgetStore.remainingBalance);
const spentPercentage = computed(() => budgetStore.spentPercentage);

const progressValue = computed(() => Math.min(spentPercentage.value / 100, 1));

const progressColor = computed(() => {
  if (spentPercentage.value >= 100) return 'danger';
  if (spentPercentage.value >= 80) return 'warning';
  return 'success';
});

const balanceColor = computed(() => {
  if (remainingBalance.value < 0) return 'negative';
  return 'positive';
});
</script>

<style scoped>
.summary-card {
  text-align: center;
  margin: 16px;
}

.balance-label {
  font-size: 0.9em;
  color: var(--ion-color-medium);
  margin-bottom: 4px;
}

.balance-amount {
  font-size: 2.2em;
  font-weight: bold;
  margin-bottom: 12px;
}

.balance-amount.positive {
  color: var(--ion-color-success);
}

.balance-amount.negative {
  color: var(--ion-color-danger);
}

.spending-bar {
  border-radius: 8px;
  height: 8px;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 0.85em;
  color: var(--ion-color-medium);
}
</style>
