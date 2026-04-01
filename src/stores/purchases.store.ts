import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { isOk } from '@/types/result';
import type { Purchase, PurchaseCreate } from '@/types/types';
import * as purchaseService from '@/services/purchase.service';
import * as itemService from '@/services/item.service';

export const usePurchasesStore = defineStore('purchases', () => {
  const purchases = ref<Purchase[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const unsubs: (() => void)[] = [];

  // --- Computed ---

  const purchasesByDate = computed(() => {
    const grouped = new Map<string, Purchase[]>();

    // Sort purchases by date desc, then by createdAt desc within same date
    const sorted = [...purchases.value].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      dateA.setHours(0, 0, 0, 0);
      dateB.setHours(0, 0, 0, 0);

      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    for (const purchase of sorted) {
      const label = getDateLabel(purchase.date);
      const group = grouped.get(label);
      if (group) {
        group.push(purchase);
      } else {
        grouped.set(label, [purchase]);
      }
    }

    return grouped;
  });

  const todayTotal = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return purchases.value
      .filter((p) => {
        const d = new Date(p.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })
      .reduce((sum, p) => sum + p.total, 0);
  });

  const monthTotal = computed(() =>
    purchases.value.reduce((sum, p) => sum + p.total, 0),
  );

  // --- Actions ---

  function cleanup(): void {
    for (const unsub of unsubs) {
      unsub();
    }
    unsubs.length = 0;
    purchases.value = [];
    loading.value = false;
    error.value = null;
  }

  function subscribe(budgetId: string, monthId: string): void {
    cleanup();
    loading.value = true;

    unsubs.push(
      purchaseService.subscribeToPurchases(
        budgetId,
        monthId,
        (data) => {
          purchases.value = data;
          loading.value = false;
        },
        (err) => {
          error.value = 'Failed to load purchases.';
          loading.value = false;
        },
      ),
    );
  }

  async function addPurchase(
    budgetId: string,
    monthId: string,
    data: PurchaseCreate,
  ): Promise<boolean> {
    error.value = null;
    const result = await purchaseService.createPurchase(budgetId, monthId, data);

    if (!isOk(result)) {
      error.value = result.error.message;
      return false;
    }

    // Fire-and-forget: auto-save items to catalog
    itemService.autoSaveItems(budgetId, data.items);

    return true;
  }

  async function removePurchase(
    budgetId: string,
    monthId: string,
    purchaseId: string,
    total: number,
  ): Promise<boolean> {
    error.value = null;
    const result = await purchaseService.deletePurchase(
      budgetId,
      monthId,
      purchaseId,
      total,
    );

    if (!isOk(result)) {
      error.value = result.error.message;
      return false;
    }

    return true;
  }

  return {
    // State
    purchases,
    loading,
    error,

    // Computed
    purchasesByDate,
    todayTotal,
    monthTotal,

    // Actions
    subscribe,
    addPurchase,
    removePurchase,
    cleanup,
  };
});

function getDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
