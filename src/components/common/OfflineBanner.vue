<template>
  <div v-if="isOffline" class="offline-banner">
    <ion-icon :icon="cloudOfflineOutline" />
    <span>You're offline — changes will sync when back online</span>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { cloudOfflineOutline } from 'ionicons/icons';
import { useOffline } from '@/composables/useOffline';

const { isOffline } = useOffline();
</script>

<style scoped>
.offline-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--ion-color-warning);
  color: #000;
  font-size: 0.85em;
  font-weight: 500;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
