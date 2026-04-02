<template>
  <div class="chart-card">
    <h3>Spending by Category</h3>
    <div v-if="data.length === 0" class="empty">No purchases yet</div>
    <template v-else>
      <div class="chart-wrapper">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
      <div class="legend">
        <div v-for="item in data" :key="item.categoryId" class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: item.categoryColor }" />
          <span class="legend-name">{{ item.categoryName }}</span>
          <span class="legend-value">{{ format(item.total) }}</span>
          <span class="legend-pct">{{ item.percentage }}%</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useCurrency } from '@/composables/useCurrency';
import type { CategorySpending } from '@/composables/useAnalytics';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  data: CategorySpending[];
}>();

const { format } = useCurrency();

const chartData = computed(() => ({
  labels: props.data.map((d) => d.categoryName),
  datasets: [
    {
      data: props.data.map((d) => d.total / 100),
      backgroundColor: props.data.map((d) => d.categoryColor),
      borderWidth: 2,
      borderColor: 'var(--ion-background-color, #fff)',
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  cutout: '60%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { label?: string; parsed: number; dataset: { data: number[] } }) => {
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
          return `${ctx.label}: ${format(Math.round(ctx.parsed * 100))} (${pct}%)`;
        },
      },
    },
  },
}));
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

.chart-wrapper {
  max-width: 220px;
  margin: 0 auto 12px;
}

.empty {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 24px 0;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
}

.legend-value {
  font-weight: 600;
}

.legend-pct {
  color: var(--ion-color-medium);
  min-width: 36px;
  text-align: right;
}
</style>
