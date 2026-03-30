<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <!-- Tabs will be configured in Phase 2+ -->
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabs, IonPage, IonRouterOutlet } from '@ionic/vue';
</script>
