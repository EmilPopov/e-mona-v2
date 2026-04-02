<template>
  <div v-if="loading" class="favorites-loading">
    <ion-spinner name="dots" />
  </div>

  <div v-else-if="favorites.length === 0" class="favorites-empty">
    <p>No favorites yet — add items after your first purchase!</p>
  </div>

  <div v-else class="favorites-grid">
    <button
      v-for="fav in favorites"
      :key="fav.id"
      class="fav-tile"
      :style="{ borderColor: fav.categoryColor }"
      @click="handleTap(fav)"
      @contextmenu.prevent="handleLongPress(fav)"
    >
      <ion-icon :icon="fav.icon || bagHandleOutline" class="fav-icon" />
      <span class="fav-name">{{ fav.itemName }}</span>
      <span class="fav-price">{{ format(fav.defaultPrice) }}</span>
      <span v-if="getCartQty(fav)" class="fav-badge">&times;{{ getCartQty(fav) }}</span>
    </button>
  </div>

  <!-- Long-press price edit popover -->
  <ion-alert
    :is-open="!!editingFav"
    header="Edit price"
    :sub-header="editingFav?.itemName"
    :inputs="[{
      name: 'price',
      type: 'number',
      placeholder: '0.00',
      value: editingFav ? fromCents(editingFav.defaultPrice) : 0,
      min: 0,
      attributes: { inputmode: 'decimal', step: '0.01' },
    }]"
    :buttons="[
      { text: 'Cancel', role: 'cancel' },
      { text: 'Add', handler: confirmLongPress },
    ]"
    @didDismiss="editingFav = null"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonIcon, IonSpinner, IonAlert } from '@ionic/vue';
import { bagHandleOutline } from 'ionicons/icons';
import { useCurrency } from '@/composables/useCurrency';
import type { Favorite, PurchaseItem } from '@/types/types';

const props = defineProps<{
  favorites: Favorite[];
  loading: boolean;
  cartItems: PurchaseItem[];
}>();

const emit = defineEmits<{
  (e: 'add-to-cart', favorite: Favorite, overridePrice?: number): void;
}>();

const { format, fromCents, toCents } = useCurrency();
const editingFav = ref<Favorite | null>(null);

function getCartQty(fav: Favorite): number {
  const match = props.cartItems.find(
    (c) => c.name === fav.itemName && c.categoryId === fav.categoryId,
  );
  return match?.quantity ?? 0;
}

function handleTap(fav: Favorite) {
  emit('add-to-cart', fav);
}

function handleLongPress(fav: Favorite) {
  editingFav.value = fav;
}

function confirmLongPress(data: { price: string }) {
  if (!editingFav.value) return;
  const price = parseFloat(data.price);
  if (!isNaN(price) && price >= 0) {
    emit('add-to-cart', editingFav.value, toCents(price));
  }
  editingFav.value = null;
}
</script>

<style scoped>
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
  padding: 8px 0;
}

.fav-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border: 2px solid var(--ion-color-light);
  border-radius: 12px;
  background: var(--ion-background-color);
  cursor: pointer;
  transition: transform 0.1s ease;
  -webkit-user-select: none;
  user-select: none;
}

.fav-tile:active {
  transform: scale(0.92);
}

.fav-icon {
  font-size: 1.5em;
  margin-bottom: 4px;
  color: var(--ion-color-primary);
}

.fav-name {
  font-size: 0.78em;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-price {
  font-size: 0.7em;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

.fav-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 0.65em;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  border-radius: 10px;
  padding: 0 4px;
}

.favorites-loading {
  text-align: center;
  padding: 16px;
}

.favorites-empty {
  text-align: center;
  padding: 12px;
  color: var(--ion-color-medium);
  font-size: 0.85em;
}
</style>
