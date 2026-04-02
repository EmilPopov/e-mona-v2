<template>
  <div v-if="data.length > 1" class="chart-card">
    <h3>Spending by Member</h3>
    <div v-for="member in data" :key="member.userId" class="member-row">
      <span class="member-name">{{ member.displayName }}</span>
      <div class="member-bar-wrapper">
        <div class="member-bar" :style="{ width: member.percentage + '%' }" />
      </div>
      <span class="member-amount">{{ format(member.total) }}</span>
      <span class="member-pct">{{ member.percentage }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '@/composables/useCurrency';
import type { MemberSpending } from '@/composables/useAnalytics';

defineProps<{
  data: MemberSpending[];
}>();

const { format } = useCurrency();
</script>

<style scoped>
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

.member-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.member-name {
  min-width: 80px;
  font-size: 0.9em;
  font-weight: 500;
}

.member-bar-wrapper {
  flex: 1;
  height: 8px;
  background: var(--ion-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.member-bar {
  height: 100%;
  background: var(--ion-color-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.member-amount {
  font-weight: 600;
  font-size: 0.9em;
  min-width: 70px;
  text-align: right;
}

.member-pct {
  color: var(--ion-color-medium);
  font-size: 0.85em;
  min-width: 36px;
  text-align: right;
}
</style>
