<template>
  <div class="dashboard-skeleton ion-padding">
    <!-- Balance card -->
    <div class="skeleton-card">
      <ion-skeleton-text animated style="width: 40%; height: 16px; margin-bottom: 8px" />
      <ion-skeleton-text animated style="width: 60%; height: 32px; margin-bottom: 12px" />
      <ion-skeleton-text animated style="width: 100%; height: 8px; border-radius: 4px" />
    </div>

    <!-- Budget breakdown -->
    <div class="skeleton-section">
      <ion-skeleton-text animated style="width: 35%; height: 14px; margin-bottom: 12px" />
      <div class="skeleton-row" v-for="i in 3" :key="i">
        <ion-skeleton-text animated style="width: 50%; height: 14px" />
        <ion-skeleton-text animated style="width: 20%; height: 14px" />
      </div>
    </div>

    <!-- Recent purchases -->
    <div class="skeleton-section">
      <ion-skeleton-text animated style="width: 45%; height: 14px; margin-bottom: 12px" />
      <div class="skeleton-item" v-for="i in 3" :key="i">
        <div>
          <ion-skeleton-text animated style="width: 120px; height: 14px; margin-bottom: 4px" />
          <ion-skeleton-text animated style="width: 80px; height: 12px" />
        </div>
        <ion-skeleton-text animated style="width: 50px; height: 14px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonSkeletonText } from '@ionic/vue';
</script>

<style scoped>
.skeleton-card {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.skeleton-section {
  margin-bottom: 20px;
}

.skeleton-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.skeleton-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--ion-color-light);
}
</style>
