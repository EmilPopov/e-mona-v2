<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home" />
        </ion-buttons>
        <ion-title>New Purchase</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Note -->
      <ion-item>
        <ion-input
          v-model="note"
          label="Note"
          label-placement="stacked"
          placeholder="Lidl shopping, Lunch..."
        />
      </ion-item>

      <!-- Item Search -->
      <ion-searchbar
        v-model="searchQuery"
        placeholder="Search items..."
        :debounce="300"
        class="ion-margin-top"
      />

      <!-- Search Results -->
      <ion-list v-if="searchResults.length > 0">
        <ion-list-header>
          <ion-label>Search Results</ion-label>
        </ion-list-header>
        <ion-item
          v-for="item in searchResults"
          :key="item.id"
          button
          @click="addFromCatalog(item)"
        >
          <ion-icon :icon="item.icon || bagHandleOutline" slot="start" />
          <ion-label>{{ item.name }}</ion-label>
          <ion-note slot="end">{{ format(item.defaultPrice) }}</ion-note>
        </ion-item>
      </ion-list>

      <!-- Manual Add Form -->
      <div class="manual-form ion-margin-top">
        <ion-list-header>
          <ion-label>Add manually</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-input
            v-model="manualName"
            label="Name"
            label-placement="stacked"
            placeholder="Item name"
          />
        </ion-item>

        <div class="price-qty-row">
          <ion-item class="price-input">
            <ion-input
              v-model.number="manualPrice"
              label="Price"
              label-placement="stacked"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </ion-item>
          <ion-item class="qty-input">
            <ion-input
              v-model.number="manualQty"
              label="Qty"
              label-placement="stacked"
              type="number"
              min="1"
              step="1"
            />
          </ion-item>
        </div>

        <ion-item>
          <ion-select
            v-model="manualCategoryId"
            label="Category"
            label-placement="stacked"
            placeholder="Select category"
            interface="action-sheet"
          >
            <ion-select-option
              v-for="cat in budgetStore.activeCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-button
          expand="block"
          fill="outline"
          class="ion-margin-top"
          :disabled="!canAddManual"
          @click="addManualItem"
        >
          <ion-icon :icon="addOutline" slot="start" />
          Add to cart
        </ion-button>
      </div>

      <!-- Cart -->
      <div v-if="cartItems.length > 0" class="cart-section ion-margin-top">
        <ion-list-header>
          <ion-label>Cart ({{ cartItems.length }} {{ cartItems.length === 1 ? 'item' : 'items' }})</ion-label>
        </ion-list-header>

        <ion-list>
          <ion-item v-for="item in cartItems" :key="item.id" lines="full">
            <span
              class="cat-dot"
              :style="{ backgroundColor: item.categoryColor }"
              slot="start"
            />
            <ion-label>
              <h3>{{ item.name }}</h3>
              <p>{{ item.categoryName }} &middot; &times;{{ item.quantity }}</p>
            </ion-label>
            <ion-button
              fill="clear"
              color="danger"
              size="small"
              slot="end"
              @click="removeFromCart(item.id)"
            >
              <ion-icon :icon="closeOutline" />
            </ion-button>
            <ion-item slot="end" class="cart-price-item" lines="none">
              <ion-input
                :value="fromCents(item.price)"
                type="number"
                step="0.01"
                min="0"
                inputmode="decimal"
                placeholder="0.00"
                class="cart-price-input"
                @ionBlur="updateCartItemPrice(item.id, $event)"
                @ionInput="updateCartItemPrice(item.id, $event)"
              />
            </ion-item>
          </ion-item>
        </ion-list>

        <div class="cart-total">
          <strong>Total:</strong>
          <strong>{{ format(cartTotal) }}</strong>
        </div>
      </div>
    </ion-content>

    <!-- Save Button -->
    <ion-footer v-if="cartItems.length > 0">
      <ion-toolbar>
        <ion-button
          expand="block"
          :disabled="saving"
          @click="savePurchase"
        >
          <ion-spinner v-if="saving" name="crescent" slot="start" />
          <ion-icon v-else :icon="checkmarkOutline" slot="start" />
          Save Purchase
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonBackButton, IonButton, IonIcon, IonSpinner,
  IonItem, IonInput, IonLabel, IonNote, IonList, IonListHeader,
  IonSelect, IonSelectOption, IonSearchbar,
} from '@ionic/vue';
import {
  addOutline, closeOutline, checkmarkOutline, bagHandleOutline,
} from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import { usePurchasesStore } from '@/stores/purchases.store';
import { useCurrency } from '@/composables/useCurrency';
import * as itemService from '@/services/item.service';
import { isOk } from '@/types/result';
import type { CatalogItem } from '@/types/types';
import type { PurchaseItem, PurchaseCreate } from '@/types/types';

const router = useRouter();
const budgetStore = useBudgetStore();
const authStore = useAuthStore();
const purchasesStore = usePurchasesStore();
const { format, toCents, fromCents } = useCurrency();

// --- State ---
const note = ref('');
const searchQuery = ref('');
const searchResults = ref<CatalogItem[]>([]);
const cartItems = ref<PurchaseItem[]>([]);
const saving = ref(false);

// Manual form
const manualName = ref('');
const manualPrice = ref<number>(0);
const manualQty = ref(1);
const manualCategoryId = ref('');

// --- Reset form on each visit (Ionic caches component) ---
function resetForm() {
  note.value = '';
  searchQuery.value = '';
  searchResults.value = [];
  cartItems.value = [];
  saving.value = false;
  manualName.value = '';
  manualPrice.value = 0;
  manualQty.value = 1;
  manualCategoryId.value = '';
}

onIonViewWillEnter(resetForm);

// --- Computed ---
const cartTotal = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
);

const canAddManual = computed(() =>
  manualName.value.trim().length > 0
  && manualPrice.value > 0
  && manualCategoryId.value !== '',
);

// --- Search ---
watch(searchQuery, async (query) => {
  const q = query.trim();
  if (q.length < 2) {
    searchResults.value = [];
    return;
  }
  const budgetId = budgetStore.budget?.id;
  if (!budgetId) return;

  const result = await itemService.searchItems(budgetId, q);
  if (isOk(result)) {
    searchResults.value = result.data;
  }
});

// --- Actions ---
function addFromCatalog(item: CatalogItem) {
  // If already in cart, increment quantity
  const existing = cartItems.value.find((c) => c.itemId === item.id);
  if (existing) {
    existing.quantity += 1;
    return;
  }

  const category = budgetStore.activeCategories.find((c) => c.id === item.categoryId);

  cartItems.value.push({
    id: crypto.randomUUID(),
    itemId: item.id,
    name: item.name,
    price: item.defaultPrice,
    quantity: 1,
    categoryId: item.categoryId,
    categoryName: category?.name ?? 'Other',
    categoryColor: category?.color ?? '#9E9E9E',
  });

  // Clear search
  searchQuery.value = '';
  searchResults.value = [];
}

function addManualItem() {
  if (!canAddManual.value) return;

  const category = budgetStore.activeCategories.find((c) => c.id === manualCategoryId.value);

  cartItems.value.push({
    id: crypto.randomUUID(),
    itemId: null,
    name: manualName.value.trim(),
    price: toCents(manualPrice.value),
    quantity: manualQty.value,
    categoryId: manualCategoryId.value,
    categoryName: category?.name ?? '',
    categoryColor: category?.color ?? '#9E9E9E',
  });

  // Clear form
  manualName.value = '';
  manualPrice.value = 0;
  manualQty.value = 1;
  manualCategoryId.value = '';
}

function updateCartItemPrice(itemId: string, event: CustomEvent) {
  const raw = event.detail.value ?? (event.target as HTMLIonInputElement)?.value;
  const value = parseFloat(raw);
  const item = cartItems.value.find((i) => i.id === itemId);
  if (item && !isNaN(value) && value >= 0) {
    item.price = toCents(value);
  }
}

function removeFromCart(itemId: string) {
  cartItems.value = cartItems.value.filter((i) => i.id !== itemId);
}

async function savePurchase() {
  if (cartItems.value.length === 0 || saving.value) return;

  const budget = budgetStore.budget;
  const month = budgetStore.currentMonth;
  if (!budget || !month || !authStore.firebaseUser || !authStore.user) return;

  saving.value = true;

  const data: PurchaseCreate = {
    date: new Date(),
    createdBy: authStore.firebaseUser.uid,
    createdByName: authStore.user.displayName,
    note: note.value.trim() || null,
    items: cartItems.value,
    total: cartTotal.value,
    createdAt: new Date(),
  };

  const success = await purchasesStore.addPurchase(budget.id, month.id, data);
  saving.value = false;

  if (success) {
    router.back();
  }
}
</script>

<style scoped>
.price-qty-row {
  display: flex;
  gap: 8px;
}

.price-input {
  flex: 2;
}

.qty-input {
  flex: 1;
}

.cat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cart-price-item {
  --inner-padding-end: 0;
  --padding-start: 0;
  --min-height: 36px;
  max-width: 90px;
}

.cart-price-input {
  --padding-start: 6px;
  --padding-end: 6px;
  --background: var(--ion-color-light);
  --border-radius: 6px;
  text-align: right;
  font-size: 0.95em;
  font-weight: 600;
}

.cart-total {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 1.1em;
}

.cart-section {
  border-top: 1px solid var(--ion-color-light);
  padding-top: 8px;
}
</style>
