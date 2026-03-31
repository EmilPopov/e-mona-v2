<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/more" />
        </ion-buttons>
        <ion-title>Fixed Costs</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showAdd = true">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="budgetStore.fixedCosts.length > 0">
        <ion-item-sliding v-for="cost in budgetStore.fixedCosts" :key="cost.id">
          <ion-item>
            <ion-icon :icon="cost.icon || 'cash-outline'" slot="start" />
            <ion-label>
              <h2>{{ cost.name }}</h2>
              <p v-if="!cost.isActive">Inactive</p>
            </ion-label>
            <ion-note slot="end">{{ format(cost.amount) }}</ion-note>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="deleteCost(cost.id)">
              <ion-icon :icon="trashOutline" slot="icon-only" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="walletOutline" class="empty-icon" />
        <p>No fixed costs yet.</p>
        <ion-button fill="outline" @click="showAdd = true">Add Fixed Cost</ion-button>
      </div>

      <div class="total-bar" v-if="budgetStore.fixedCosts.length > 0">
        Total: <strong>{{ format(budgetStore.totalFixedCosts) }}</strong>
      </div>

      <!-- Add Modal -->
      <ion-modal :is-open="showAdd" @didDismiss="resetForm">
        <ion-header>
          <ion-toolbar>
            <ion-title>Add Fixed Cost</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showAdd = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-item>
            <ion-input
              v-model="newName"
              label="Name"
              label-placement="stacked"
              placeholder="e.g. Rent"
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model.number="newAmount"
              label="Amount"
              label-placement="stacked"
              type="number"
              inputmode="decimal"
              min="0"
            />
          </ion-item>
          <ion-button
            expand="block"
            class="ion-margin-top"
            :disabled="!newName.trim() || !newAmount"
            @click="addCost"
          >
            <ion-spinner v-if="saving" name="crescent" />
            <template v-else>Add</template>
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonBackButton, IonIcon, IonItem,
  IonLabel, IonNote, IonList, IonInput, IonModal, IonSpinner,
  IonItemSliding, IonItemOptions, IonItemOption,
} from '@ionic/vue';
import { addOutline, trashOutline, walletOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCurrency } from '@/composables/useCurrency';
import * as fixedCostService from '@/services/fixed-cost.service';

const budgetStore = useBudgetStore();
const authStore = useAuthStore();
const { format, toCents } = useCurrency();

const showAdd = ref(false);
const saving = ref(false);
const newName = ref('');
const newAmount = ref(0);

function resetForm() {
  showAdd.value = false;
  newName.value = '';
  newAmount.value = 0;
}

async function addCost() {
  if (!budgetStore.budget) return;
  saving.value = true;
  await fixedCostService.createFixedCost(budgetStore.budget.id, {
    name: newName.value.trim(),
    amount: toCents(newAmount.value),
    categoryId: '',
    icon: 'cash-outline',
    isActive: true,
    createdBy: authStore.firebaseUser?.uid ?? '',
  });
  saving.value = false;
  resetForm();
}

async function deleteCost(costId: string) {
  if (!budgetStore.budget) return;
  await fixedCostService.deleteFixedCost(budgetStore.budget.id, costId);
}
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

.total-bar {
  text-align: center;
  padding: 16px;
  font-size: 1.05em;
  color: var(--ion-color-medium);
}
</style>
