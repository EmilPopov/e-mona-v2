<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>More</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item router-link="/tabs/more/profile" detail>
          <ion-icon :icon="personCircleOutline" slot="start" />
          <ion-label>Profile & Settings</ion-label>
        </ion-item>

        <ion-item router-link="/tabs/more/fixed-costs" detail>
          <ion-icon :icon="walletOutline" slot="start" />
          <ion-label>Fixed Costs</ion-label>
        </ion-item>

        <ion-item router-link="/tabs/more/yearly-goals" detail>
          <ion-icon :icon="flagOutline" slot="start" />
          <ion-label>Yearly Goals</ion-label>
        </ion-item>

        <ion-item router-link="/tabs/more/categories" detail>
          <ion-icon :icon="pricetagsOutline" slot="start" />
          <ion-label>Categories</ion-label>
        </ion-item>
      </ion-list>

      <div class="version-label">
        <ion-text color="medium">App version: 1.0.0</ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem, IonIcon, IonLabel, IonText,
} from '@ionic/vue';
import {
  personCircleOutline,
  walletOutline,
  flagOutline,
  pricetagsOutline,
} from 'ionicons/icons';
</script>

<style scoped>
.version-label {
  text-align: center;
  padding: 24px 0;
  font-size: 0.85em;
}
</style>
