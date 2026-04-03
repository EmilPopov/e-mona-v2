<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Purchases</ion-title>
        <ion-note slot="end" class="month-label">{{ monthLabel }}</ion-note>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading -->
      <PurchaseListSkeleton v-if="purchasesStore.loading" />

      <!-- Empty state -->
      <div v-else-if="purchasesStore.purchases.length === 0" class="center-state">
        <ion-icon :icon="receiptOutline" class="empty-icon" />
        <p>No purchases this month</p>
        <ion-button router-link="/tabs/new-purchase" fill="outline">
          <ion-icon :icon="addOutline" slot="start" />
          Add Purchase
        </ion-button>
      </div>

      <!-- Grouped list -->
      <template v-else>
        <div v-for="[dateLabel, group] in purchasesStore.purchasesByDate" :key="dateLabel" class="day-group">
          <ion-list-header>
            <ion-label>{{ dateLabel }}</ion-label>
            <ion-note>{{ format(dayTotal(group)) }}</ion-note>
          </ion-list-header>

          <ion-list>
            <ion-item-sliding v-for="purchase in group" :key="purchase.id">
              <ion-item
                button
                :router-link="`/tabs/purchases/${purchase.id}`"
              >
                <ion-label>
                  <h2>{{ purchase.note || 'Purchase' }}</h2>
                  <p class="item-summary">{{ itemSummary(purchase) }}</p>
                  <p class="purchase-meta">
                    {{ formatTime(purchase.date) }} &middot; {{ purchase.createdByName }}
                  </p>
                </ion-label>
                <ion-note slot="end" class="purchase-total">
                  {{ format(purchase.total) }}
                </ion-note>
              </ion-item>

              <ion-item-options side="end">
                <ion-item-option color="danger" @click="confirmDelete(purchase)">
                  <ion-icon :icon="trashOutline" slot="icon-only" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </ion-list>
        </div>
      </template>
    </ion-content>

    <!-- FAB for quick add -->
    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button router-link="/tabs/new-purchase">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonNote,
  IonList, IonListHeader, IonItem, IonLabel, IonIcon, IonButton,
  IonRefresher, IonRefresherContent,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonFab, IonFabButton,
  alertController,
} from '@ionic/vue';
import type { RefresherCustomEvent } from '@ionic/vue';
import { addOutline, receiptOutline, trashOutline } from 'ionicons/icons';
import PurchaseListSkeleton from '@/components/common/PurchaseListSkeleton.vue';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import { usePurchasesStore } from '@/stores/purchases.store';
import { useCurrency } from '@/composables/useCurrency';
import { useMonthFormat } from '@/composables/useMonthFormat';
import type { Purchase } from '@/types/types';

const budgetStore = useBudgetStore();
const authStore = useAuthStore();
const purchasesStore = usePurchasesStore();
const { format } = useCurrency();
const { monthLabel } = useMonthFormat();

function dayTotal(group: Purchase[]): number {
  return group.reduce((sum, p) => sum + p.total, 0);
}

function itemSummary(purchase: Purchase): string {
  const names = purchase.items.map((i) => i.name);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

async function handleRefresh(event: RefresherCustomEvent) {
  const budgetId = authStore.user?.activeBudgetId;
  if (budgetId) {
    await budgetStore.loadBudget(budgetId);
  }
  event.detail.complete();
}

async function confirmDelete(purchase: Purchase) {
  const alert = await alertController.create({
    header: 'Delete Purchase',
    message: `Delete "${purchase.note || 'this purchase'}" (${format(purchase.total)})?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: () => {
          const budget = budgetStore.budget;
          const month = budgetStore.currentMonth;
          if (budget && month) {
            purchasesStore.removePurchase(budget.id, month.id, purchase.id, purchase.total);
          }
        },
      },
    ],
  });
  await alert.present();
}
</script>

<style scoped>
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 80px;
}

.empty-icon {
  font-size: 3em;
  color: var(--ion-color-medium);
  margin-bottom: 12px;
}

.month-label {
  padding-right: 16px;
  font-size: 0.9em;
}

.day-group {
  margin-bottom: 8px;
}

.item-summary {
  font-size: 0.85em;
  color: var(--ion-color-medium);
}

.purchase-meta {
  font-size: 0.8em;
  color: var(--ion-color-medium-shade);
}

.purchase-total {
  font-weight: 600;
  font-size: 1em;
}
</style>
