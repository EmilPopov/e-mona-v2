import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { isOk } from '@/types/result';
import * as notificationService from '@/services/notification.service';

/**
 * Composable for managing push notification lifecycle.
 * Handles permission requests, FCM registration, and deep-link navigation.
 */
export function useNotifications() {
  const authStore = useAuthStore();
  const router = useRouter();

  const permissionStatus = ref<'granted' | 'denied' | 'unknown' | 'unsupported'>('unknown');
  const loading = ref(false);
  let unsubPush: (() => void) | null = null;

  const isSupported = computed(() => notificationService.isPushSupported());
  const isEnabled = computed(() => permissionStatus.value === 'granted');

  /** Listen for push deep-link navigation events */
  function handlePushNavigate(event: Event) {
    const path = (event as CustomEvent<string>).detail;
    if (path) {
      router.push(path);
    }
  }

  /** Request permission and register for push if granted */
  async function initPush(): Promise<void> {
    if (!isSupported.value) {
      permissionStatus.value = 'unsupported';
      return;
    }

    loading.value = true;
    try {
      const permResult = await notificationService.requestPermission();
      if (!isOk(permResult)) {
        permissionStatus.value = 'unsupported';
        return;
      }

      permissionStatus.value = permResult.data;

      if (permResult.data === 'granted' && authStore.firebaseUser) {
        const regResult = await notificationService.registerPush(authStore.firebaseUser.uid);
        if (isOk(regResult)) {
          unsubPush = regResult.data;
        }

        // Listen for deep-link navigation from notification taps
        window.addEventListener('push:navigate', handlePushNavigate);
      }
    } finally {
      loading.value = false;
    }
  }

  /** Update notification preferences in Firestore */
  async function updatePrefs(prefs: {
    dailyReminder?: boolean;
    budgetAlerts?: boolean;
    reminderTime?: string;
  }): Promise<boolean> {
    const current = authStore.user?.notificationPrefs;
    if (!current) return false;

    const result = await authStore.updateProfile({
      notificationPrefs: { ...current, ...prefs },
    });
    return isOk(result);
  }

  /** Clean up listeners */
  function cleanup() {
    if (unsubPush) {
      unsubPush();
      unsubPush = null;
    }
    window.removeEventListener('push:navigate', handlePushNavigate);
  }

  onUnmounted(cleanup);

  return {
    permissionStatus,
    isSupported,
    isEnabled,
    loading,
    initPush,
    updatePrefs,
    cleanup,
  };
}
