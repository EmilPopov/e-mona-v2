<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/more" />
        </ion-buttons>
        <ion-title>Yearly Goals</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showAdd = true">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="budgetStore.yearlyGoals.length > 0">
        <ion-item-sliding v-for="goal in budgetStore.yearlyGoals" :key="goal.id">
          <ion-item>
            <ion-icon :icon="goal.icon || 'flag-outline'" slot="start" />
            <ion-label>
              <h2>{{ goal.name }}</h2>
              <p>{{ format(goal.monthlyAmount) }}/month</p>
              <p v-if="!goal.isActive" class="inactive-label">Inactive</p>
            </ion-label>
            <ion-note slot="end">{{ format(goal.targetAmount) }}/yr</ion-note>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="deleteGoal(goal.id)">
              <ion-icon :icon="trashOutline" slot="icon-only" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="flagOutline" class="empty-icon" />
        <p>No yearly goals yet.</p>
        <ion-button fill="outline" @click="showAdd = true">Add Yearly Goal</ion-button>
      </div>

      <div class="total-bar" v-if="budgetStore.yearlyGoals.length > 0">
        Monthly deduction: <strong>{{ format(budgetStore.totalGoalDeductions) }}</strong>
      </div>

      <!-- Add Modal -->
      <ion-modal :is-open="showAdd" @didDismiss="resetForm">
        <ion-header>
          <ion-toolbar>
            <ion-title>Add Yearly Goal</ion-title>
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
              placeholder="e.g. Holiday"
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model.number="newTarget"
              label="Yearly Target"
              label-placement="stacked"
              type="number"
              inputmode="decimal"
              min="0"
            />
          </ion-item>
          <p class="monthly-hint" v-if="newTarget > 0">
            = {{ format(toCents(Math.round(newTarget / 12))) }}/month
          </p>
          <ion-button
            expand="block"
            class="ion-margin-top"
            :disabled="!newName.trim() || !newTarget"
            @click="addGoal"
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
import { addOutline, trashOutline, flagOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCurrency } from '@/composables/useCurrency';
import * as yearlyGoalService from '@/services/yearly-goal.service';
import * as monthService from '@/services/month.service';

const budgetStore = useBudgetStore();
const authStore = useAuthStore();
const { format, toCents } = useCurrency();

const showAdd = ref(false);
const saving = ref(false);
const newName = ref('');
const newTarget = ref(0);

function resetForm() {
  showAdd.value = false;
  newName.value = '';
  newTarget.value = 0;
}

async function addGoal() {
  if (!budgetStore.budget) return;
  saving.value = true;
  await yearlyGoalService.createYearlyGoal(budgetStore.budget.id, {
    name: newName.value.trim(),
    targetAmount: toCents(newTarget.value),
    categoryId: '',
    icon: 'flag-outline',
    startMonth: monthService.getCurrentMonthId(),
    isActive: true,
    createdBy: authStore.firebaseUser?.uid ?? '',
  });
  saving.value = false;
  resetForm();
}

async function deleteGoal(goalId: string) {
  if (!budgetStore.budget) return;
  await yearlyGoalService.deleteYearlyGoal(budgetStore.budget.id, goalId);
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

.monthly-hint {
  color: var(--ion-color-primary);
  font-size: 0.9em;
  text-align: center;
  margin-top: 8px;
}

.inactive-label {
  color: var(--ion-color-warning);
}
</style>
