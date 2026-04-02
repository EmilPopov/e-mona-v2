<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Invite Member</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding ion-text-center">
      <!-- Generating state -->
      <div v-if="generating" class="center-state">
        <ion-spinner name="crescent" />
        <p>Generating invite code...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="center-state">
        <ion-icon :icon="alertCircleOutline" class="error-icon" color="danger" />
        <p>{{ error }}</p>
        <ion-button fill="outline" @click="generate">Try Again</ion-button>
      </div>

      <!-- Code display -->
      <div v-else-if="invitation" class="code-section">
        <p class="invite-label">Share this code with your family member:</p>

        <div class="code-display">
          <span v-for="(char, i) in invitation.code.split('')" :key="i" class="code-char">
            {{ char }}
          </span>
        </div>

        <p class="expiry-note">Expires in 24 hours</p>

        <ion-button expand="block" class="ion-margin-top" @click="copyCode">
          <ion-icon :icon="copyOutline" slot="start" />
          {{ copied ? 'Copied!' : 'Copy Code' }}
        </ion-button>

        <ion-button expand="block" fill="outline" class="ion-margin-top" @click="shareCode">
          <ion-icon :icon="shareOutline" slot="start" />
          Share...
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
} from '@ionic/vue';
import { copyOutline, shareOutline, alertCircleOutline } from 'ionicons/icons';
import * as invitationService from '@/services/invitation.service';
import { isOk } from '@/types/result';
import type { Invitation } from '@/types/types';

const props = defineProps<{
  isOpen: boolean;
  budgetId: string;
  budgetName: string;
  adminUserId: string;
  adminName: string;
}>();

defineEmits<{
  close: [];
}>();

const generating = ref(false);
const error = ref<string | null>(null);
const invitation = ref<Invitation | null>(null);
const copied = ref(false);

watch(() => props.isOpen, (open) => {
  if (open) {
    generate();
  } else {
    invitation.value = null;
    error.value = null;
    copied.value = false;
  }
});

async function generate() {
  generating.value = true;
  error.value = null;

  const result = await invitationService.createInvitation(
    props.budgetId,
    props.budgetName,
    props.adminUserId,
    props.adminName,
  );

  generating.value = false;

  if (isOk(result)) {
    invitation.value = result.data;
  } else {
    error.value = result.error.message;
  }
}

async function copyCode() {
  if (!invitation.value) return;
  try {
    await navigator.clipboard.writeText(invitation.value.code);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // Fallback — clipboard may not be available
    error.value = 'Could not copy to clipboard.';
  }
}

async function shareCode() {
  if (!invitation.value || !navigator.share) {
    await copyCode();
    return;
  }
  try {
    await navigator.share({
      title: 'Join my budget on e-mona',
      text: `Join "${props.budgetName}" on e-mona! Use invite code: ${invitation.value.code}`,
    });
  } catch {
    // User cancelled or share not available
  }
}
</script>

<style scoped>
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 60px;
}

.error-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

.code-section {
  padding-top: 40px;
}

.invite-label {
  font-size: 1.05em;
  color: var(--ion-color-medium);
  margin-bottom: 24px;
}

.code-display {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.code-char {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 56px;
  font-size: 1.8em;
  font-weight: 700;
  font-family: monospace;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.expiry-note {
  color: var(--ion-color-medium);
  font-size: 0.9em;
}
</style>
