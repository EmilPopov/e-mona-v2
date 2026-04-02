<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Welcome</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="logout">
            <ion-icon :icon="logOutOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="welcome-content">
        <h1>Welcome to e-mona</h1>
        <p class="subtitle">Your family budget, simplified.</p>

        <!-- Create new budget -->
        <ion-button
          expand="block"
          size="large"
          class="ion-margin-top"
          router-link="/budget/setup"
        >
          <ion-icon :icon="addCircleOutline" slot="start" />
          Create New Budget
        </ion-button>

        <div class="divider">
          <span>or</span>
        </div>

        <!-- Join with code -->
        <h3>Join a family budget</h3>
        <p class="join-hint">Enter the 6-digit invite code from your family member.</p>

        <div class="code-input-row">
          <input
            v-for="(_, i) in 6"
            :key="i"
            :ref="(el) => { if (el) codeInputs[i] = el as HTMLInputElement }"
            class="code-input"
            maxlength="1"
            inputmode="text"
            autocapitalize="characters"
            @input="onCodeInput(i, $event)"
            @keydown="onCodeKeydown(i, $event)"
            @paste="onPaste($event)"
          />
        </div>

        <!-- Validation result -->
        <div v-if="validating" class="validation-state ion-margin-top">
          <ion-spinner name="crescent" />
          <span>Checking code...</span>
        </div>

        <div v-if="validatedInvitation" class="validation-success ion-margin-top">
          <ion-icon :icon="checkmarkCircleOutline" color="success" />
          <div>
            <strong>{{ validatedInvitation.budgetName }}</strong>
            <p>Invited by {{ validatedInvitation.createdByName }}</p>
          </div>
        </div>

        <div v-if="validationError" class="validation-error ion-margin-top">
          <ion-icon :icon="alertCircleOutline" color="danger" />
          <span>{{ validationError }}</span>
        </div>

        <ion-button
          v-if="validatedInvitation"
          expand="block"
          color="success"
          class="ion-margin-top"
          :disabled="joining"
          @click="joinBudget"
        >
          <ion-spinner v-if="joining" name="crescent" slot="start" />
          <ion-icon v-else :icon="enterOutline" slot="start" />
          Join Budget
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  toastController,
} from '@ionic/vue';
import {
  addCircleOutline, checkmarkCircleOutline, alertCircleOutline,
  enterOutline, logOutOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth.store';
import { useBudgetStore } from '@/stores/budget.store';
import * as invitationService from '@/services/invitation.service';
import { isOk } from '@/types/result';
import type { Invitation } from '@/types/types';

const router = useRouter();
const authStore = useAuthStore();
const budgetStore = useBudgetStore();

const codeInputs = ref<HTMLInputElement[]>([]);
const codeChars = ref<string[]>(['', '', '', '', '', '']);
const validating = ref(false);
const validationError = ref<string | null>(null);
const validatedInvitation = ref<Invitation | null>(null);
const joining = ref(false);

const fullCode = computed(() => codeChars.value.join(''));

function onCodeInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.value.toUpperCase();
  input.value = value;
  codeChars.value[index] = value;

  if (value && index < 5) {
    codeInputs.value[index + 1]?.focus();
  }

  // Auto-validate when all 6 chars entered
  if (fullCode.value.length === 6) {
    validateCode();
  } else {
    validatedInvitation.value = null;
    validationError.value = null;
  }
}

function onCodeKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !codeChars.value[index] && index > 0) {
    codeInputs.value[index - 1]?.focus();
  }
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault();
  const pasted = (event.clipboardData?.getData('text') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (let i = 0; i < 6 && i < pasted.length; i++) {
    codeChars.value[i] = pasted[i];
    if (codeInputs.value[i]) {
      codeInputs.value[i].value = pasted[i];
    }
  }
  if (pasted.length >= 6) {
    codeInputs.value[5]?.focus();
    validateCode();
  }
}

async function validateCode() {
  validating.value = true;
  validationError.value = null;
  validatedInvitation.value = null;

  const result = await invitationService.validateCode(fullCode.value);
  validating.value = false;

  if (isOk(result)) {
    validatedInvitation.value = result.data;
  } else {
    validationError.value = result.error.message;
  }
}

async function joinBudget() {
  if (!validatedInvitation.value || !authStore.firebaseUser || !authStore.user) return;
  joining.value = true;

  const result = await invitationService.redeemCode(
    fullCode.value,
    authStore.firebaseUser.uid,
    authStore.user.displayName,
    authStore.user.email,
  );

  joining.value = false;

  if (isOk(result)) {
    await budgetStore.loadBudget(result.data);
    router.replace('/tabs/home');
  } else {
    const toast = await toastController.create({
      message: result.error.message,
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  }
}

async function logout() {
  await authStore.logout();
  router.replace('/login');
}
</script>

<style scoped>
.welcome-content {
  max-width: 400px;
  margin: 0 auto;
  padding-top: 24px;
  text-align: center;
}

h1 {
  font-size: 1.8em;
  margin-bottom: 4px;
}

.subtitle {
  color: var(--ion-color-medium);
  font-size: 1.05em;
  margin-bottom: 24px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: var(--ion-color-medium);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid var(--ion-color-light);
}

.divider span {
  padding: 0 12px;
  font-size: 0.9em;
}

h3 {
  margin: 0 0 4px;
}

.join-hint {
  color: var(--ion-color-medium);
  font-size: 0.9em;
  margin-bottom: 16px;
}

.code-input-row {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.code-input {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 1.6em;
  font-weight: 700;
  font-family: monospace;
  border: 2px solid var(--ion-color-light);
  border-radius: 8px;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  outline: none;
  text-transform: uppercase;
}

.code-input:focus {
  border-color: var(--ion-color-primary);
}

.validation-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ion-color-medium);
}

.validation-success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.validation-success ion-icon {
  font-size: 1.5em;
}

.validation-success p {
  margin: 0;
  font-size: 0.85em;
  color: var(--ion-color-medium);
}

.validation-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ion-color-danger);
}
</style>
