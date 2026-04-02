import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/types/types';
import { isOk } from '@/types/result';
import * as authService from '@/services/auth.service';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const firebaseUser = ref<FirebaseUser | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => !!firebaseUser.value);

  let unsubProfile: (() => void) | null = null;

  function cleanupProfileSubscription(): void {
    if (unsubProfile) {
      unsubProfile();
      unsubProfile = null;
    }
  }

  function init(): () => void {
    const unsubAuth = authService.onAuthChange((fbUser) => {
      firebaseUser.value = fbUser;
      cleanupProfileSubscription();

      if (fbUser) {
        unsubProfile = authService.subscribeToUserProfile(fbUser.uid, (profile) => {
          user.value = profile;
          initialized.value = true;
        });
      } else {
        user.value = null;
        initialized.value = true;
      }
    });

    return () => {
      unsubAuth();
      cleanupProfileSubscription();
    };
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      return await authService.login(email, password);
    } finally {
      loading.value = false;
    }
  }

  async function register(email: string, password: string, displayName: string) {
    loading.value = true;
    try {
      return await authService.register(email, password, displayName);
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    try {
      const result = await authService.logout();
      if (isOk(result)) {
        user.value = null;
        firebaseUser.value = null;
      }
      return result;
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(data: Partial<Omit<User, 'id' | 'createdAt'>>) {
    if (!firebaseUser.value) {
      return { success: false as const, error: { code: 'auth/requires-recent-login', message: 'Not authenticated.' } };
    }
    return authService.updateUserProfile(firebaseUser.value.uid, data);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    return authService.changePassword(currentPassword, newPassword);
  }

  /** Waits for the Firestore user profile to load (up to timeout ms). */
  function waitForProfile(timeout = 5000): Promise<User | null> {
    if (user.value) return Promise.resolve(user.value);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        unwatch();
        resolve(null);
      }, timeout);
      const unwatch = watch(user, (val) => {
        if (val) {
          clearTimeout(timer);
          unwatch();
          resolve(val);
        }
      });
    });
  }

  return {
    user,
    firebaseUser,
    loading,
    initialized,
    isAuthenticated,
    init,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    waitForProfile,
  };
});
