import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import * as favoritesService from '@/services/favorites.service';
import { isOk } from '@/types/result';
import type { Favorite, FavoriteCreate } from '@/types/types';

export function useFavorites() {
  const authStore = useAuthStore();
  const favorites = ref<Favorite[]>([]);
  const loading = ref(true);

  let unsubscribe: (() => void) | null = null;

  function subscribe() {
    const userId = authStore.firebaseUser?.uid;
    if (!userId) {
      loading.value = false;
      return;
    }

    unsubscribe = favoritesService.subscribeFavorites(
      userId,
      (items) => {
        favorites.value = items;
        loading.value = false;
      },
    );
  }

  onMounted(subscribe);

  onUnmounted(() => {
    unsubscribe?.();
  });

  async function addFavorite(data: FavoriteCreate): Promise<boolean> {
    const userId = authStore.firebaseUser?.uid;
    if (!userId) return false;
    const result = await favoritesService.addFavorite(userId, data);
    return isOk(result);
  }

  async function removeFavorite(favoriteId: string): Promise<boolean> {
    const userId = authStore.firebaseUser?.uid;
    if (!userId) return false;
    const result = await favoritesService.removeFavorite(userId, favoriteId);
    return isOk(result);
  }

  async function reorderFavorites(orderedIds: string[]): Promise<boolean> {
    const userId = authStore.firebaseUser?.uid;
    if (!userId) return false;
    const result = await favoritesService.reorderFavorites(userId, orderedIds);
    return isOk(result);
  }

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    reorderFavorites,
  };
}
