<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/more" />
        </ion-buttons>
        <ion-title>Notifications</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Platform not supported banner -->
      <ion-card v-if="!isSupported" class="info-card">
        <ion-card-content>
          <ion-icon :icon="informationCircleOutline" class="info-icon" />
          <p>Push notifications are only available on mobile devices. Install the app to receive reminders and alerts.</p>
        </ion-card-content>
      </ion-card>

      <ion-list>
        <ion-list-header>
          <ion-label>Reminders</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-icon :icon="notificationsOutline" slot="start" />
          <ion-label>
            <h2>Daily Reminder</h2>
            <p>Remind me to log expenses</p>
          </ion-label>
          <ion-toggle
            :checked="prefs.dailyReminder"
            @ionChange="toggleDailyReminder($event.detail.checked)"
          />
        </ion-item>

        <ion-item v-if="prefs.dailyReminder">
          <ion-icon :icon="timeOutline" slot="start" />
          <ion-label>
            <h2>Reminder Time</h2>
            <p>{{ prefs.reminderTime }}</p>
          </ion-label>
          <ion-select
            :value="prefs.reminderTime"
            interface="action-sheet"
            @ionChange="updateReminderTime($event.detail.value)"
          >
            <ion-select-option v-for="time in timeOptions" :key="time" :value="time">
              {{ time }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-list-header>
          <ion-label>Budget Alerts</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-icon :icon="warningOutline" slot="start" />
          <ion-label>
            <h2>Budget Alerts</h2>
            <p>Alert at 80% and when overspent</p>
          </ion-label>
          <ion-toggle
            :checked="prefs.budgetAlerts"
            @ionChange="toggleBudgetAlerts($event.detail.checked)"
          />
        </ion-item>
      </ion-list>

      <!-- Permission prompt for first-time setup -->
      <ion-card v-if="isSupported && permissionStatus === 'unknown'" class="permission-card">
        <ion-card-content class="permission-content">
          <ion-icon :icon="notificationsOutline" class="permission-icon" />
          <h2>Stay on top of your budget!</h2>
          <p>We'll remind you to log expenses and alert you when spending gets high.</p>
          <ion-button expand="block" @click="enableNotifications" :disabled="loading">
            Enable Notifications
          </ion-button>
          <ion-button expand="block" fill="clear" color="medium" @click="permissionStatus = 'denied'">
            Maybe Later
          </ion-button>
        </ion-card-content>
      </ion-card>

      <div v-if="permissionStatus === 'denied'" class="denied-note">
        <ion-text color="medium">
          Notifications are disabled. Enable them in your device settings to receive reminders.
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonList, IonListHeader,
  IonItem, IonIcon, IonLabel, IonToggle, IonSelect, IonSelectOption,
  IonCard, IonCardContent, IonButton, IonText,
} from '@ionic/vue';
import {
  notificationsOutline,
  timeOutline,
  warningOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth.store';
import { useNotifications } from '@/composables/useNotifications';

const authStore = useAuthStore();
const { permissionStatus, isSupported, loading, initPush, updatePrefs } = useNotifications();

const prefs = computed(() => authStore.user?.notificationPrefs ?? {
  dailyReminder: true,
  budgetAlerts: true,
  reminderTime: '20:00',
});

const timeOptions = [
  '08:00', '09:00', '10:00', '12:00', '14:00',
  '16:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];

async function enableNotifications() {
  await initPush();
}

async function toggleDailyReminder(checked: boolean) {
  await updatePrefs({ dailyReminder: checked });
}

async function toggleBudgetAlerts(checked: boolean) {
  await updatePrefs({ budgetAlerts: checked });
}

async function updateReminderTime(time: string) {
  if (time) {
    await updatePrefs({ reminderTime: time });
  }
}
</script>

<style scoped>
.info-card {
  margin: 16px;
}

.info-card ion-card-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-icon {
  font-size: 1.5em;
  color: var(--ion-color-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.permission-card {
  margin: 24px 16px;
}

.permission-content {
  text-align: center;
  padding: 24px 16px;
}

.permission-icon {
  font-size: 3em;
  color: var(--ion-color-primary);
  margin-bottom: 12px;
}

.permission-content h2 {
  font-size: 1.2em;
  font-weight: 700;
  margin-bottom: 8px;
}

.permission-content p {
  color: var(--ion-color-medium);
  margin-bottom: 20px;
}

.denied-note {
  text-align: center;
  padding: 24px 16px;
  font-size: 0.85em;
}
</style>
