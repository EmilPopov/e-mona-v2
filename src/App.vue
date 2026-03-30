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
import { IonApp, IonRouterOutlet, IonSpinner } from '@ionic/vue';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
</script>

<style scoped>
.app-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
