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
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem, IonIcon, IonLabel,
} from '@ionic/vue';
import { personCircleOutline } from 'ionicons/icons';
</script>
