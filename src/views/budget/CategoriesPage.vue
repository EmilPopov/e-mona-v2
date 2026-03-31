<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/more" />
        </ion-buttons>
        <ion-title>Categories</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="budgetStore.categories.length > 0">
        <ion-item v-for="cat in budgetStore.categories" :key="cat.id">
          <div
            class="color-dot"
            :style="{ backgroundColor: cat.color }"
            slot="start"
          />
          <ion-icon :icon="cat.icon" slot="start" />
          <ion-label>
            <h2>{{ cat.name }}</h2>
            <p v-if="!cat.isActive">Inactive</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="pricetagsOutline" class="empty-icon" />
        <p>No categories found.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon, IonItem, IonLabel, IonList,
} from '@ionic/vue';
import { pricetagsOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';

const budgetStore = useBudgetStore();
</script>

<style scoped>
.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-right: 4px;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
}
</style>
