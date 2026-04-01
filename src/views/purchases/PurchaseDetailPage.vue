<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/purchases" />
        </ion-buttons>
        <ion-title>{{ purchase?.note || 'Purchase' }}</ion-title>
        <ion-buttons slot="end" v-if="canEdit">
          <ion-button color="danger" @click="confirmDelete">
            <ion-icon :icon="trashOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="!purchase" class="center-state">
        <ion-spinner name="crescent" />
      </div>

      <template v-else>
        <!-- Purchase info -->
        <ion-list>
          <ion-item>
            <ion-label>
              <p>Date</p>
              <h2>{{ formatDate(purchase.date) }}</h2>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>Added by</p>
              <h2>{{ purchase.createdByName }}</h2>
            </ion-label>
          </ion-item>
          <ion-item v-if="purchase.note">
            <ion-label>
              <p>Note</p>
              <h2>{{ purchase.note }}</h2>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Items -->
        <ion-list-header class="ion-margin-top">
          <ion-label>Items ({{ purchase.items.length }})</ion-label>
        </ion-list-header>

        <ion-list>
          <ion-item v-for="item in purchase.items" :key="item.id">
            <span
              class="cat-dot"
              :style="{ backgroundColor: item.categoryColor }"
              slot="start"
            />
            <ion-label>
              <h3>{{ item.name }}</h3>
              <p>{{ item.categoryName }} &middot; {{ format(item.price) }} &times; {{ item.quantity }}</p>
            </ion-label>
            <ion-note slot="end" class="item-total">
              {{ format(item.price * item.quantity) }}
            </ion-note>
          </ion-item>
        </ion-list>

        <!-- Total -->
        <div class="purchase-total">
          <strong>Total</strong>
          <strong>{{ format(purchase.total) }}</strong>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonListHeader, IonItem, IonLabel, IonNote, IonSpinner,
  alertController,
} from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import { usePurchasesStore } from '@/stores/purchases.store';
import { useCurrency } from '@/composables/useCurrency';

const route = useRoute();
const router = useRouter();
const budgetStore = useBudgetStore();
const authStore = useAuthStore();
const purchasesStore = usePurchasesStore();
const { format } = useCurrency();

const purchase = computed(() => {
  const id = route.params.purchaseId as string;
  return purchasesStore.purchases.find((p) => p.id === id) ?? null;
});

const canEdit = computed(() => {
  if (!purchase.value || !authStore.firebaseUser) return false;
  const uid = authStore.firebaseUser.uid;
  // Creator can edit/delete, admin can edit/delete any
  if (purchase.value.createdBy === uid) return true;
  const member = budgetStore.budget?.members[uid];
  return member?.role === 'admin';
});

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function confirmDelete() {
  if (!purchase.value) return;

  const alert = await alertController.create({
    header: 'Delete Purchase',
    message: `Delete "${purchase.value.note || 'this purchase'}" (${format(purchase.value.total)})?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          const budget = budgetStore.budget;
          const month = budgetStore.currentMonth;
          if (budget && month && purchase.value) {
            const success = await purchasesStore.removePurchase(
              budget.id, month.id, purchase.value.id, purchase.value.total,
            );
            if (success) {
              router.back();
            }
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
  align-items: center;
  justify-content: center;
  padding-top: 80px;
}

.cat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-total {
  font-weight: 600;
}

.purchase-total {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  font-size: 1.2em;
  border-top: 1px solid var(--ion-color-light);
  margin-top: 8px;
}
</style>
