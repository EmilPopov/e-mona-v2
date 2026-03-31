<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ monthTitle }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="subtitle">Review and confirm your monthly budget.</p>

      <!-- Incomes -->
      <div class="section">
        <div class="section-header">
          <h3>Income</h3>
          <ion-button fill="clear" size="small" @click="addIncome">
            <ion-icon :icon="addOutline" slot="start" />
            Add
          </ion-button>
        </div>

        <ion-list>
          <ion-item v-for="(income, idx) in editableIncomes" :key="income.id">
            <ion-input
              v-model="income.name"
              label="Source"
              label-placement="stacked"
              class="ion-margin-end"
            />
            <ion-input
              v-model.number="income.displayAmount"
              label="Amount"
              label-placement="stacked"
              type="number"
              inputmode="decimal"
              min="0"
            />
            <ion-button
              v-if="editableIncomes.length > 1"
              fill="clear"
              color="danger"
              slot="end"
              @click="editableIncomes.splice(idx, 1)"
            >
              <ion-icon :icon="trashOutline" />
            </ion-button>
          </ion-item>
        </ion-list>

        <div class="section-total">
          Total: <strong>{{ format(totalIncomeCents) }}</strong>
        </div>
      </div>

      <!-- Fixed Costs (read-only snapshot) -->
      <div class="section" v-if="month?.appliedFixedCosts.length">
        <h3>Fixed Costs</h3>
        <ion-list>
          <ion-item v-for="cost in month.appliedFixedCosts" :key="cost.costId">
            <ion-label>{{ cost.name }}</ion-label>
            <ion-note slot="end">{{ format(cost.amount) }}</ion-note>
          </ion-item>
        </ion-list>
        <div class="section-total">
          Total: <strong>{{ format(month.totalFixedCosts) }}</strong>
        </div>
      </div>

      <!-- Yearly Goals (read-only snapshot) -->
      <div class="section" v-if="month?.appliedGoalDeductions.length">
        <h3>Yearly Goals</h3>
        <ion-list>
          <ion-item v-for="goal in month.appliedGoalDeductions" :key="goal.goalId">
            <ion-label>{{ goal.name }}</ion-label>
            <ion-note slot="end">{{ format(goal.monthlyAmount) }}/mo</ion-note>
          </ion-item>
        </ion-list>
        <div class="section-total">
          Total: <strong>{{ format(month.totalGoalDeductions) }}</strong>
        </div>
      </div>

      <!-- Rollover -->
      <div class="section" v-if="rolloverAvailable > 0">
        <h3>Rollover</h3>
        <ion-item lines="none">
          <ion-toggle v-model="rolloverEnabled">
            Carry over {{ format(rolloverAvailable) }} from last month
          </ion-toggle>
        </ion-item>
      </div>

      <!-- Summary -->
      <ion-card class="summary-card">
        <ion-card-content>
          <div class="summary-row">
            <span>Spending Budget</span>
            <strong>{{ format(spendingBudgetCents) }}</strong>
          </div>
          <div class="summary-row" v-if="rolloverEnabled && rolloverAvailable > 0">
            <span>+ Rollover</span>
            <strong>{{ format(rolloverAvailable) }}</strong>
          </div>
          <div class="summary-row total">
            <span>Available</span>
            <strong>{{ format(availableCents) }}</strong>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button
          expand="block"
          class="ion-margin"
          :disabled="confirming || !hasValidIncome"
          @click="confirm"
        >
          <ion-spinner v-if="confirming" name="crescent" />
          <template v-else>Confirm {{ monthTitle }}</template>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButton, IonIcon, IonInput, IonItem, IonList, IonLabel, IonNote,
  IonToggle, IonCard, IonCardContent, IonSpinner, toastController,
} from '@ionic/vue';
import { addOutline, trashOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useCurrency } from '@/composables/useCurrency';

const router = useRouter();
const budgetStore = useBudgetStore();
const { format, toCents, fromCents } = useCurrency();

const confirming = ref(false);
const rolloverEnabled = ref(false);

const month = computed(() => budgetStore.currentMonth);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthTitle = computed(() => {
  if (!month.value) return 'New Month';
  return `${MONTH_NAMES[month.value.month - 1]} ${month.value.year}`;
});

// Editable incomes (display amounts, not cents)
const editableIncomes = ref<{ id: string; name: string; displayAmount: number }[]>([]);

onMounted(() => {
  if (month.value) {
    editableIncomes.value = month.value.incomes.map((i) => ({
      id: i.id,
      name: i.name,
      displayAmount: fromCents(i.amount),
    }));
    rolloverEnabled.value = month.value.rolloverEnabled;
  }
});

const rolloverAvailable = computed(() => month.value?.rolloverAmount ?? 0);

const totalIncomeCents = computed(() =>
  editableIncomes.value.reduce((sum, i) => sum + toCents(i.displayAmount || 0), 0),
);

const spendingBudgetCents = computed(() =>
  totalIncomeCents.value
  - (month.value?.totalFixedCosts ?? 0)
  - (month.value?.totalGoalDeductions ?? 0),
);

const availableCents = computed(() =>
  spendingBudgetCents.value + (rolloverEnabled.value ? rolloverAvailable.value : 0),
);

const hasValidIncome = computed(() =>
  editableIncomes.value.some((i) => i.name.trim() && i.displayAmount > 0),
);

function addIncome() {
  editableIncomes.value.push({
    id: crypto.randomUUID(),
    name: '',
    displayAmount: 0,
  });
}

async function confirm() {
  if (!month.value || !budgetStore.budget) return;
  confirming.value = true;

  const incomes = editableIncomes.value
    .filter((i) => i.name.trim() && i.displayAmount > 0)
    .map((i) => ({
      id: i.id,
      name: i.name.trim(),
      amount: toCents(i.displayAmount),
      addedBy: month.value!.incomes.find((orig) => orig.id === i.id)?.addedBy ?? '',
    }));

  const success = await budgetStore.confirmCurrentMonth(
    incomes,
    rolloverEnabled.value,
    rolloverEnabled.value ? rolloverAvailable.value : 0,
  );

  confirming.value = false;

  if (success) {
    router.replace('/tabs/home');
  } else {
    const toast = await toastController.create({
      message: 'Failed to confirm month. Please try again.',
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }
}
</script>

<style scoped>
.subtitle {
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section h3,
.section-header h3 {
  margin: 0 0 8px 0;
}

.section-total {
  text-align: right;
  padding: 8px 16px;
  color: var(--ion-color-medium);
}

.summary-card {
  margin-top: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.summary-row.total {
  border-top: 1px solid var(--ion-color-light);
  margin-top: 8px;
  padding-top: 12px;
  font-size: 1.15em;
}
</style>
