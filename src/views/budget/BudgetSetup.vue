<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ stepTitles[step] }}</ion-title>
        <ion-buttons slot="start" v-if="step > 0">
          <ion-button @click="step--">
            <ion-icon :icon="arrowBack" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-progress-bar :value="(step + 1) / 5" />
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Step 0: Budget Name & Currency -->
      <div v-if="step === 0">
        <h2>Welcome! Let's set up your budget</h2>
        <p>Give your budget a name and pick your currency.</p>

        <ion-item>
          <ion-input
            v-model="budgetName"
            label="Budget Name"
            label-placement="stacked"
            placeholder="e.g. Popov Family"
            :maxlength="50"
          />
        </ion-item>

        <ion-item class="ion-margin-top">
          <ion-select
            v-model="currency"
            label="Currency"
            label-placement="stacked"
            interface="popover"
          >
            <ion-select-option value="EUR">EUR (€)</ion-select-option>
            <ion-select-option value="USD">USD ($)</ion-select-option>
            <ion-select-option value="GBP">GBP (£)</ion-select-option>
          </ion-select>
        </ion-item>
      </div>

      <!-- Step 1: Incomes -->
      <div v-if="step === 1">
        <h2>Add your income sources</h2>
        <p>These will be pre-filled each month. You can adjust them later.</p>

        <ion-list>
          <ion-item v-for="(income, idx) in incomes" :key="idx">
            <ion-input
              v-model="income.name"
              label="Source"
              label-placement="stacked"
              placeholder="e.g. Salary"
              class="ion-margin-end"
            />
            <ion-input
              v-model.number="income.displayAmount"
              label="Amount"
              label-placement="stacked"
              type="number"
              :placeholder="currencySymbol"
              inputmode="decimal"
              min="0"
            />
            <ion-button
              v-if="incomes.length > 1"
              fill="clear"
              color="danger"
              slot="end"
              @click="incomes.splice(idx, 1)"
            >
              <ion-icon :icon="trashOutline" />
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-button expand="block" fill="outline" class="ion-margin-top" @click="addIncome">
          <ion-icon :icon="addOutline" slot="start" />
          Add another income
        </ion-button>

        <div class="total-row ion-margin-top">
          <strong>Total Income: {{ formatAmount(totalIncomeDisplay) }}</strong>
        </div>
      </div>

      <!-- Step 2: Fixed Costs -->
      <div v-if="step === 2">
        <h2>Set up your fixed costs</h2>
        <p>Recurring monthly bills. These are auto-deducted each month.</p>

        <ion-list>
          <ion-item v-for="(cost, idx) in fixedCostsInput" :key="idx">
            <ion-input
              v-model="cost.name"
              label="Name"
              label-placement="stacked"
              placeholder="e.g. Rent"
              class="ion-margin-end"
            />
            <ion-input
              v-model.number="cost.displayAmount"
              label="Amount"
              label-placement="stacked"
              type="number"
              :placeholder="currencySymbol"
              inputmode="decimal"
              min="0"
            />
            <ion-button
              fill="clear"
              color="danger"
              slot="end"
              @click="fixedCostsInput.splice(idx, 1)"
            >
              <ion-icon :icon="trashOutline" />
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-button expand="block" fill="outline" class="ion-margin-top" @click="addFixedCost">
          <ion-icon :icon="addOutline" slot="start" />
          Add a fixed cost
        </ion-button>

        <div class="total-row ion-margin-top">
          <strong>Total Fixed Costs: {{ formatAmount(totalFixedCostsDisplay) }}</strong>
        </div>

        <p class="ion-text-center hint">You can skip this step and add them later.</p>
      </div>

      <!-- Step 3: Yearly Goals -->
      <div v-if="step === 3">
        <h2>Any yearly savings goals?</h2>
        <p>Set a yearly target — we'll deduct 1/12 each month.</p>

        <ion-list>
          <ion-item v-for="(goal, idx) in yearlyGoalsInput" :key="idx" lines="full">
            <div class="goal-inputs">
              <ion-input
                v-model="goal.name"
                label="Name"
                label-placement="stacked"
                placeholder="e.g. Holiday"
              />
              <ion-input
                v-model.number="goal.displayTarget"
                label="Yearly Target"
                label-placement="stacked"
                type="number"
                :placeholder="currencySymbol"
                inputmode="decimal"
                min="0"
              />
              <p class="monthly-note" v-if="goal.displayTarget > 0">
                = {{ formatAmount(Math.round((goal.displayTarget || 0) / 12)) }}/month
              </p>
            </div>
            <ion-button
              fill="clear"
              color="danger"
              slot="end"
              @click="yearlyGoalsInput.splice(idx, 1)"
            >
              <ion-icon :icon="trashOutline" />
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-button expand="block" fill="outline" class="ion-margin-top" @click="addYearlyGoal">
          <ion-icon :icon="addOutline" slot="start" />
          Add a yearly goal
        </ion-button>

        <div class="total-row ion-margin-top">
          <strong>Monthly Deduction: {{ formatAmount(totalGoalMonthlyDisplay) }}</strong>
        </div>

        <p class="ion-text-center hint">You can skip this step and add them later.</p>
      </div>

      <!-- Step 4: Summary -->
      <div v-if="step === 4">
        <h2>Summary</h2>
        <p>Here's your monthly budget breakdown:</p>

        <ion-card>
          <ion-card-content>
            <div class="summary-row">
              <span>Income</span>
              <span class="positive">{{ formatAmount(totalIncomeDisplay) }}</span>
            </div>
            <div class="summary-row" v-if="totalFixedCostsDisplay > 0">
              <span>Fixed Costs</span>
              <span class="negative">-{{ formatAmount(totalFixedCostsDisplay) }}</span>
            </div>
            <div class="summary-row" v-if="totalGoalMonthlyDisplay > 0">
              <span>Goal Savings</span>
              <span class="negative">-{{ formatAmount(totalGoalMonthlyDisplay) }}</span>
            </div>
            <div class="summary-divider" />
            <div class="summary-row summary-total">
              <span>Spending Budget</span>
              <span :class="spendingBudgetDisplay >= 0 ? 'positive' : 'negative'">
                {{ formatAmount(spendingBudgetDisplay) }}/month
              </span>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-text color="medium" v-if="spendingBudgetDisplay < 0">
          <p class="ion-text-center">
            Your fixed costs and goals exceed your income. You can still create the budget and adjust later.
          </p>
        </ion-text>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button
          expand="block"
          :disabled="!canProceed"
          @click="nextStep"
          class="ion-margin"
        >
          <ion-spinner v-if="creating" name="crescent" />
          <template v-else>
            {{ step === 4 ? 'Create Budget' : 'Continue' }}
          </template>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButton, IonButtons, IonIcon, IonInput, IonSelect, IonSelectOption,
  IonItem, IonList, IonCard, IonCardContent, IonText, IonProgressBar,
  IonSpinner, toastController,
} from '@ionic/vue';
import { arrowBack, addOutline, trashOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCurrency } from '@/composables/useCurrency';
import * as fixedCostService from '@/services/fixed-cost.service';
import * as yearlyGoalService from '@/services/yearly-goal.service';
import * as monthService from '@/services/month.service';
import { isOk } from '@/types/result';
import type { CurrencyCode } from '@/types/types';

const router = useRouter();
const budgetStore = useBudgetStore();
const authStore = useAuthStore();
const { format: formatCurrency, toCents } = useCurrency();

const step = ref(0);
const creating = ref(false);

const stepTitles = ['New Budget', 'Income', 'Fixed Costs', 'Yearly Goals', 'Summary'];

// Step 0
const budgetName = ref('');
const currency = ref<CurrencyCode>('EUR');

// Step 1
const incomes = ref([{ name: '', displayAmount: 0 }]);

// Step 2
const fixedCostsInput = ref<{ name: string; displayAmount: number }[]>([]);

// Step 3
const yearlyGoalsInput = ref<{ name: string; displayTarget: number }[]>([]);

const currencySymbol = computed(() => {
  const symbols: Record<CurrencyCode, string> = { EUR: '€', USD: '$', GBP: '£' };
  return symbols[currency.value];
});

function formatAmount(displayAmount: number): string {
  return formatCurrency(toCents(displayAmount));
}

// Totals (in display amounts, not cents)
const totalIncomeDisplay = computed(() =>
  incomes.value.reduce((sum, i) => sum + (i.displayAmount || 0), 0),
);
const totalFixedCostsDisplay = computed(() =>
  fixedCostsInput.value.reduce((sum, c) => sum + (c.displayAmount || 0), 0),
);
const totalGoalMonthlyDisplay = computed(() =>
  yearlyGoalsInput.value.reduce((sum, g) => sum + Math.round((g.displayTarget || 0) / 12), 0),
);
const spendingBudgetDisplay = computed(() =>
  totalIncomeDisplay.value - totalFixedCostsDisplay.value - totalGoalMonthlyDisplay.value,
);

// Validation
const canProceed = computed(() => {
  if (creating.value) return false;
  switch (step.value) {
    case 0: return budgetName.value.trim().length > 0;
    case 1: return incomes.value.some((i) => i.name.trim() && i.displayAmount > 0);
    case 2: return true; // optional
    case 3: return true; // optional
    case 4: return true;
    default: return false;
  }
});

function addIncome() {
  incomes.value.push({ name: '', displayAmount: 0 });
}

function addFixedCost() {
  fixedCostsInput.value.push({ name: '', displayAmount: 0 });
}

function addYearlyGoal() {
  yearlyGoalsInput.value.push({ name: '', displayTarget: 0 });
}

async function nextStep() {
  if (step.value < 4) {
    step.value++;
    return;
  }

  // Step 4: Create budget
  await createBudget();
}

async function createBudget() {
  creating.value = true;

  const userId = authStore.firebaseUser?.uid ?? '';

  // 1. Create budget (seeds categories + items + updates user)
  const budgetId = await budgetStore.createBudget(budgetName.value.trim(), currency.value);
  if (!budgetId) {
    await showToast('Failed to create budget. Please try again.');
    creating.value = false;
    return;
  }

  // 2. Create fixed costs
  const validCosts = fixedCostsInput.value.filter((c) => c.name.trim() && c.displayAmount > 0);
  for (const cost of validCosts) {
    await fixedCostService.createFixedCost(budgetId, {
      name: cost.name.trim(),
      amount: toCents(cost.displayAmount),
      categoryId: '',
      icon: 'cash-outline',
      isActive: true,
      createdBy: userId,
    });
  }

  // 3. Create yearly goals
  const validGoals = yearlyGoalsInput.value.filter((g) => g.name.trim() && g.displayTarget > 0);
  for (const goal of validGoals) {
    await yearlyGoalService.createYearlyGoal(budgetId, {
      name: goal.name.trim(),
      targetAmount: toCents(goal.displayTarget),
      categoryId: '',
      icon: 'flag-outline',
      startMonth: monthService.getCurrentMonthId(),
      isActive: true,
      createdBy: userId,
    });
  }

  // 4. Build incomes and create the first month as "active" (skip draft review for setup)
  const validIncomes = incomes.value.filter((i) => i.name.trim() && i.displayAmount > 0);
  const incomeEntries = validIncomes.map((i) => ({
    id: crypto.randomUUID(),
    name: i.name.trim(),
    amount: toCents(i.displayAmount),
    addedBy: userId,
  }));

  // Snapshot the fixed costs and goals we just created
  const appliedFixedCosts = validCosts.map((c) => ({
    costId: '',
    name: c.name.trim(),
    amount: toCents(c.displayAmount),
  }));
  const appliedGoalDeductions = validGoals.map((g) => ({
    goalId: '',
    name: g.name.trim(),
    monthlyAmount: Math.round(toCents(g.displayTarget) / 12),
    accumulatedTotal: Math.round(toCents(g.displayTarget) / 12),
  }));

  const monthId = monthService.getCurrentMonthId();
  const monthResult = await monthService.createDraftMonth(budgetId, monthId, {
    incomes: incomeEntries,
    appliedFixedCosts,
    appliedGoalDeductions,
    rolloverAmount: 0,
    rolloverEnabled: false,
  });

  if (isOk(monthResult)) {
    // Immediately confirm the first month
    await monthService.confirmMonth(budgetId, monthId, userId, {
      incomes: incomeEntries,
      rolloverEnabled: false,
      rolloverAmount: 0,
    });
  }

  // 5. Load the budget into the store and navigate
  await budgetStore.loadBudget(budgetId);

  // Force refresh the user profile so activeBudgetId is set
  creating.value = false;
  router.replace('/tabs/home');
}

async function showToast(message: string) {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'bottom',
    color: 'danger',
  });
  await toast.present();
}
</script>

<style scoped>
h2 {
  margin-bottom: 4px;
}

.total-row {
  text-align: center;
  padding: 12px 0;
  font-size: 1.1em;
}

.hint {
  color: var(--ion-color-medium);
  font-size: 0.9em;
  margin-top: 8px;
}

.goal-inputs {
  width: 100%;
}

.monthly-note {
  color: var(--ion-color-primary);
  font-size: 0.85em;
  margin: 4px 0 0 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 1.05em;
}

.summary-divider {
  border-top: 1px solid var(--ion-color-light);
  margin: 8px 0;
}

.summary-total {
  font-weight: bold;
  font-size: 1.15em;
}

.positive {
  color: var(--ion-color-success);
}

.negative {
  color: var(--ion-color-danger);
}
</style>
