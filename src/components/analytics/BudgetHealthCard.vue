<template>
  <div v-if="health" class="health-card" :class="health.status">
    <div class="health-header">
      <span class="status-icon">{{ statusIcon }}</span>
      <span class="status-label">{{ statusLabel }}</span>
    </div>

    <div class="remaining">{{ format(health.remainingBalance) }} remaining</div>
    <div class="sub">{{ health.daysRemaining }} days left this month</div>

    <div class="progress-bar">
      <div
        class="progress-fill"
        :style="{ width: Math.min(health.spentPercentage, 100) + '%' }"
      />
    </div>
    <div class="progress-label">
      {{ format(health.totalPurchases) }} of {{ format(health.spendingBudget) }} spent
      ({{ health.spentPercentage }}%)
    </div>

    <div class="stats">
      <div class="stat">
        <span class="stat-label">Daily average</span>
        <span class="stat-value">{{ format(health.dailyAverage) }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Safe to spend/day</span>
        <span class="stat-value">{{ format(health.safeToSpend) }}</span>
      </div>
    </div>

    <div class="projection">
      At this rate, you'll end the month with
      <strong>{{ format(health.projectedRemaining) }}</strong>
      {{ health.projectedRemaining >= 0 ? 'left' : 'over budget' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCurrency } from '@/composables/useCurrency';
import type { BudgetHealth } from '@/composables/useAnalytics';

const props = defineProps<{
  health: BudgetHealth | null;
}>();

const { format } = useCurrency();

const statusIcon = computed(() => {
  if (!props.health) return '';
  return { green: '🟢', yellow: '🟡', red: '🔴' }[props.health.status];
});

const statusLabel = computed(() => {
  if (!props.health) return '';
  return { green: 'On Track', yellow: 'Watch Spending', red: 'Over Budget' }[props.health.status];
});
</script>

<style scoped>
.health-card {
  background: var(--ion-card-background, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border-left: 4px solid var(--ion-color-success);
}

.health-card.yellow {
  border-left-color: var(--ion-color-warning);
}

.health-card.red {
  border-left-color: var(--ion-color-danger);
}

.health-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-label {
  font-weight: 700;
  font-size: 1em;
}

.remaining {
  font-size: 1.5em;
  font-weight: 700;
  margin-bottom: 2px;
}

.sub {
  font-size: 0.85em;
  color: var(--ion-color-medium);
  margin-bottom: 12px;
}

.progress-bar {
  height: 8px;
  background: var(--ion-color-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.green .progress-fill {
  background: var(--ion-color-success);
}

.yellow .progress-fill {
  background: var(--ion-color-warning);
}

.red .progress-fill {
  background: var(--ion-color-danger);
}

.progress-label {
  font-size: 0.8em;
  color: var(--ion-color-medium);
  margin-bottom: 12px;
}

.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8em;
  color: var(--ion-color-medium);
}

.stat-value {
  font-size: 1.1em;
  font-weight: 600;
}

.projection {
  font-size: 0.85em;
  color: var(--ion-color-medium);
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-light);
}
</style>
