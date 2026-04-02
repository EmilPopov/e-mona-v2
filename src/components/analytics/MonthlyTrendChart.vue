<template>
  <div class="chart-card">
    <h3>Monthly Trend</h3>
    <div v-if="data.length === 0" class="empty">Not enough data yet</div>
    <div v-else class="chart-wrapper">
      <Bar :data="(chartData as unknown as ChartData<'bar'>)" :options="(chartOptions as unknown as ChartOptions<'bar'>)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useCurrency } from '@/composables/useCurrency';
import type { MonthlyTrend } from '@/composables/useAnalytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const props = defineProps<{
  data: MonthlyTrend[];
}>();

const { format } = useCurrency();

const chartData = computed(() => ({
  labels: props.data.map((d) => d.label),
  datasets: [
    {
      type: 'bar' as const,
      label: 'Spent',
      data: props.data.map((d) => d.totalPurchases / 100),
      backgroundColor: 'rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.7)',
      borderRadius: 6,
      barPercentage: 0.6,
    },
    {
      type: 'line' as const,
      label: 'Budget',
      data: props.data.map((d) => d.spendingBudget / 100),
      borderColor: 'rgba(var(--ion-color-danger-rgb, 235, 68, 90), 0.8)',
      borderDash: [6, 3],
      borderWidth: 2,
      pointRadius: 3,
      fill: false,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  interaction: { intersect: false, mode: 'index' as const },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: number | string) => format(Number(value) * 100),
        maxTicksLimit: 5,
      },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
    x: {
      grid: { display: false },
    },
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: { boxWidth: 12, padding: 12 },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
          `${ctx.dataset.label}: ${format(Math.round(ctx.parsed.y * 100))}`,
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
  position: relative;
}

.empty {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 24px 0;
}
</style>
