<template>
  <div class="purchase-list-skeleton">
    <div v-for="group in 2" :key="group" class="skeleton-group">
      <!-- Date header -->
      <div class="skeleton-header">
        <ion-skeleton-text animated style="width: 30%; height: 14px" />
        <ion-skeleton-text animated style="width: 15%; height: 14px" />
      </div>

      <!-- Purchase items -->
      <div v-for="item in 3" :key="item" class="skeleton-purchase">
        <div class="skeleton-left">
          <ion-skeleton-text animated style="width: 120px; height: 14px; margin-bottom: 4px" />
          <ion-skeleton-text animated style="width: 80px; height: 12px; margin-bottom: 2px" />
          <ion-skeleton-text animated style="width: 60px; height: 10px" />
        </div>
        <ion-skeleton-text animated style="width: 50px; height: 16px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonSkeletonText } from '@ionic/vue';
</script>

<style scoped>
.skeleton-group {
  margin-bottom: 16px;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
}

.skeleton-purchase {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ion-color-light);
}

.skeleton-left {
  flex: 1;
}
</style>
