<template>
  <ion-app>
    <div v-if="!authStore.initialized" class="app-loading">
      <ion-spinner name="crescent" />
      <p>Loading...</p>
    </div>
    <ion-router-outlet v-else />
  </ion-app>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { IonApp, IonRouterOutlet, IonSpinner } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import * as notificationService from '@/services/notification.service';
import { isOk } from '@/types/result';

const authStore = useAuthStore();
const router = useRouter();

// Register for push notifications when user logs in (native only)
let unsubPush: (() => void) | null = null;

watch(
  () => authStore.firebaseUser,
  async (fbUser) => {
    // Clean up previous registration
    if (unsubPush) {
      unsubPush();
      unsubPush = null;
    }

    if (!fbUser || !notificationService.isPushSupported()) return;

    const permResult = await notificationService.requestPermission();
    if (!isOk(permResult) || permResult.data !== 'granted') return;

    const regResult = await notificationService.registerPush(fbUser.uid);
    if (isOk(regResult)) {
      unsubPush = regResult.data;
    }
  },
  { immediate: true }
);

// Handle deep-link navigation from notification taps
window.addEventListener('push:navigate', (event) => {
  const path = (event as CustomEvent<string>).detail;
  if (path) {
    router.push(path);
  }
});
</script>

<style scoped>
.app-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
