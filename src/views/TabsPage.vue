<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="purchases" href="/tabs/purchases">
          <ion-icon :icon="receiptOutline" />
          <ion-label>Purchases</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="new-purchase" href="/tabs/new-purchase">
          <ion-icon :icon="addCircleOutline" />
          <ion-label>Add</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="more" href="/tabs/more">
          <ion-icon :icon="ellipsisHorizontalOutline" />
          <ion-label>More</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonTabBar, IonTabButton, IonTabs, IonLabel,
  IonIcon, IonPage, IonRouterOutlet,
} from '@ionic/vue';
import { homeOutline, receiptOutline, addCircleOutline, ellipsisHorizontalOutline } from 'ionicons/icons';
</script>
