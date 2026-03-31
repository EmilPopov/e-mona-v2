<template>
  <div class="recent-section">
    <div class="section-header">
      <h3>Recent Purchases</h3>
    </div>
    <ion-list v-if="false" lines="full">
      <!-- Wired in Phase 3 when purchases are implemented -->
    </ion-list>
    <div class="empty-state" v-else>
      <ion-icon :icon="cartOutline" class="empty-icon" />
      <p>No purchases yet this month.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonList, IonIcon } from '@ionic/vue';
import { cartOutline } from 'ionicons/icons';
</script>

<style scoped>
.recent-section {
  margin: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 2.5em;
  margin-bottom: 8px;
}
</style>
