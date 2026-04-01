<template>
  <div class="recent-section">
    <div class="section-header">
      <h3>Recent Purchases</h3>
      <ion-button
        v-if="recentPurchases.length > 0"
        fill="clear"
        size="small"
        router-link="/tabs/purchases"
      >
        View all
      </ion-button>
    </div>

    <ion-list v-if="recentPurchases.length > 0" lines="full">
      <ion-item
        v-for="purchase in recentPurchases"
        :key="purchase.id"
        button
        :router-link="`/tabs/purchases/${purchase.id}`"
      >
        <ion-label>
          <h3>{{ purchase.note || 'Purchase' }}</h3>
          <p>{{ itemSummary(purchase) }} &middot; {{ purchase.createdByName }}</p>
        </ion-label>
        <ion-note slot="end" class="purchase-total">
          {{ format(purchase.total) }}
        </ion-note>
      </ion-item>
    </ion-list>

    <div class="empty-state" v-else>
      <ion-icon :icon="cartOutline" class="empty-icon" />
      <p>No purchases yet this month.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon } from '@ionic/vue';
import { cartOutline } from 'ionicons/icons';
import { usePurchasesStore } from '@/stores/purchases.store';
import { useCurrency } from '@/composables/useCurrency';
import type { Purchase } from '@/types/types';

const purchasesStore = usePurchasesStore();
const { format } = useCurrency();

const recentPurchases = computed(() =>
  purchasesStore.purchases.slice(0, 5),
);

function itemSummary(purchase: Purchase): string {
  const names = purchase.items.map((i) => i.name);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}
</script>

<style scoped>
.recent-section {
  margin: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 2.5em;
  margin-bottom: 8px;
}

.purchase-total {
  font-weight: 600;
}
</style>
