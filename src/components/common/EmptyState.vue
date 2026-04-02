<template>
  <div class="empty-state">
    <ion-icon :icon="icon" class="empty-icon" />
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <ion-button
      v-if="actionLabel && actionHref"
      fill="outline"
      :router-link="actionHref"
    >
      {{ actionLabel }}
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonIcon, IonButton } from '@ionic/vue';

defineProps<{
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 16px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

h3 {
  margin: 0 0 4px;
  font-size: 1.1em;
  color: var(--ion-text-color);
}

p {
  margin: 0 0 16px;
  font-size: 0.9em;
}
</style>
