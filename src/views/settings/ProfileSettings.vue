<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/more" />
        </ion-buttons>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="user" class="profile-container">
        <!-- Avatar -->
        <div class="avatar-section">
          <div
            class="avatar-circle"
            :style="{ backgroundColor: user.avatarColor }"
          >
            {{ initials }}
          </div>
          <h2>{{ user.displayName }}</h2>
          <p class="email">{{ user.email }}</p>
        </div>

        <!-- Display Name -->
        <ion-list inset>
          <ion-item>
            <ion-input
              v-model="displayName"
              label="Display Name"
              label-placement="floating"
              @ion-blur="saveDisplayName"
            />
          </ion-item>
        </ion-list>

        <!-- Avatar Color -->
        <ion-list inset>
          <ion-item>
            <ion-label>Avatar Color</ion-label>
          </ion-item>
          <ion-item>
            <div class="color-grid">
              <button
                v-for="color in avatarColors"
                :key="color"
                class="color-swatch"
                :class="{ selected: color === user.avatarColor }"
                :style="{ backgroundColor: color }"
                @click="saveAvatarColor(color)"
              />
            </div>
          </ion-item>
        </ion-list>

        <!-- Currency -->
        <ion-list inset>
          <ion-item>
            <ion-select
              v-model="currency"
              label="Currency"
              interface="popover"
              @ion-change="saveCurrency"
            >
              <ion-select-option value="EUR">EUR</ion-select-option>
              <ion-select-option value="USD">USD</ion-select-option>
              <ion-select-option value="GBP">GBP</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <!-- Change Password -->
        <ion-list inset>
          <ion-item button @click="showChangePassword = true" detail>
            <ion-label>Change Password</ion-label>
          </ion-item>
        </ion-list>

        <!-- Logout -->
        <div class="logout-section">
          <ion-button
            expand="block"
            color="danger"
            fill="outline"
            shape="round"
            @click="handleLogout"
          >
            Log Out
          </ion-button>
        </div>
      </div>

      <!-- Change Password Modal -->
      <ion-modal :is-open="showChangePassword" @did-dismiss="showChangePassword = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Change Password</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showChangePassword = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list>
            <ion-item>
              <ion-input
                v-model="currentPassword"
                type="password"
                label="Current Password"
                label-placement="floating"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="newPassword"
                type="password"
                label="New Password"
                label-placement="floating"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="confirmNewPassword"
                type="password"
                label="Confirm New Password"
                label-placement="floating"
              />
            </ion-item>
          </ion-list>
          <p v-if="passwordError" class="error-text">{{ passwordError }}</p>
          <ion-button
            expand="block"
            shape="round"
            class="ion-margin-top"
            :disabled="passwordLoading"
            @click="handleChangePassword"
          >
            <ion-spinner v-if="passwordLoading" name="crescent" />
            <span v-else>Update Password</span>
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonContent, IonList, IonItem, IonInput,
  IonLabel, IonSelect, IonSelectOption, IonButton,
  IonModal, IonSpinner,
} from '@ionic/vue';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { isOk } from '@/types/result';
import type { CurrencyCode } from '@/types/types';

const authStore = useAuthStore();
const router = useRouter();
const { showSuccess, showError } = useToast();

const user = computed(() => authStore.user);
const initials = computed(() => {
  if (!user.value) return '';
  return user.value.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const displayName = ref(user.value?.displayName ?? '');
const currency = ref<CurrencyCode>(user.value?.currency ?? 'EUR');

watch(user, (u) => {
  if (u) {
    displayName.value = u.displayName;
    currency.value = u.currency;
  }
});

const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];

async function saveDisplayName(): Promise<void> {
  if (!displayName.value.trim() || displayName.value.trim().length < 2) return;
  if (displayName.value.trim() === user.value?.displayName) return;
  const result = await authStore.updateProfile({ displayName: displayName.value.trim() });
  if (isOk(result)) {
    await showSuccess('Name updated.');
  } else {
    await showError(result.error);
  }
}

async function saveAvatarColor(color: string): Promise<void> {
  const result = await authStore.updateProfile({ avatarColor: color });
  if (isOk(result)) {
    await showSuccess('Avatar color updated.');
  } else {
    await showError(result.error);
  }
}

async function saveCurrency(): Promise<void> {
  const result = await authStore.updateProfile({ currency: currency.value });
  if (isOk(result)) {
    await showSuccess('Currency updated.');
  } else {
    await showError(result.error);
  }
}

// Change password
const showChangePassword = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const passwordError = ref<string | null>(null);
const passwordLoading = ref(false);

async function handleChangePassword(): Promise<void> {
  passwordError.value = null;

  if (newPassword.value.length < 6) {
    passwordError.value = 'New password must be at least 6 characters.';
    return;
  }
  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = 'Passwords do not match.';
    return;
  }

  passwordLoading.value = true;
  const result = await authStore.changePassword(currentPassword.value, newPassword.value);
  passwordLoading.value = false;

  if (isOk(result)) {
    await showSuccess('Password changed.');
    showChangePassword.value = false;
    currentPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
  } else {
    passwordError.value = result.error.message;
  }
}

async function handleLogout(): Promise<void> {
  const result = await authStore.logout();
  if (isOk(result)) {
    await router.replace('/login');
  } else {
    await showError(result.error);
  }
}
</script>

<style scoped>
.profile-container {
  max-width: 500px;
  margin: 0 auto;
}

.avatar-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
}

.avatar-section h2 {
  margin: 0;
}

.email {
  color: var(--ion-color-medium);
  margin: 0.25rem 0 0;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  padding: 0;
}

.color-swatch.selected {
  border-color: var(--ion-color-dark);
  box-shadow: 0 0 0 2px white, 0 0 0 4px var(--ion-color-dark);
}

.logout-section {
  margin-top: 2rem;
}

.error-text {
  color: var(--ion-color-danger);
  font-size: 0.875rem;
  text-align: center;
  margin: 0.5rem 0;
}
</style>
