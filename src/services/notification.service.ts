import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Result, ok, fail } from '@/types/result';

/**
 * Check if push notifications are supported on this platform.
 * Web browsers don't support Capacitor push notifications.
 */
export function isPushSupported(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request notification permission from the user.
 * Returns 'granted' | 'denied' | 'unsupported'.
 */
export async function requestPermission(): Promise<Result<'granted' | 'denied'>> {
  if (!isPushSupported()) {
    return fail({ code: 'notifications/unsupported', message: 'Push notifications are not supported on this platform.' });
  }

  try {
    const permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'granted') {
      return ok('granted');
    }

    if (permStatus.receive === 'denied') {
      return ok('denied');
    }

    // Prompt user
    const result = await PushNotifications.requestPermissions();
    return ok(result.receive === 'granted' ? 'granted' : 'denied');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to request permission';
    return fail({ code: 'notifications/permission-error', message });
  }
}

/**
 * Register for push notifications and set up token/notification listeners.
 * Returns an unsubscribe function to remove all listeners.
 */
export async function registerPush(userId: string): Promise<Result<() => void>> {
  if (!isPushSupported()) {
    return fail({ code: 'notifications/unsupported', message: 'Push notifications are not supported on this platform.' });
  }

  try {
    await PushNotifications.register();

    // Listen for registration success — save token to Firestore
    const registrationListener = await PushNotifications.addListener('registration', async (token) => {
      await saveFcmToken(userId, token.value);
    });

    // Listen for registration errors
    const errorListener = await PushNotifications.addListener('registrationError', () => {
      // Silent fail — token will be retried next launch
    });

    // Listen for incoming notifications while app is open
    const receivedListener = await PushNotifications.addListener('pushNotificationReceived', () => {
      // Could show an in-app toast here in the future
    });

    // Listen for notification taps (app opened from notification)
    const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const data = notification.notification.data;
      if (data?.type === 'daily_reminder') {
        // Navigate to new purchase — handled by the composable
        window.dispatchEvent(new CustomEvent('push:navigate', { detail: '/tabs/new-purchase' }));
      }
    });

    // Return cleanup function
    const unsubscribe = () => {
      registrationListener.remove();
      errorListener.remove();
      receivedListener.remove();
      actionListener.remove();
    };

    return ok(unsubscribe);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to register push notifications';
    return fail({ code: 'notifications/registration-error', message });
  }
}

/**
 * Save an FCM token to the user's Firestore document.
 * Uses arrayUnion to avoid duplicates.
 */
export async function saveFcmToken(userId: string, token: string): Promise<Result<void>> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token),
    });
    return ok(undefined);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save FCM token';
    return fail({ code: 'notifications/token-save-error', message });
  }
}

/**
 * Remove an FCM token from the user's Firestore document (e.g. on logout).
 */
export async function removeFcmToken(userId: string, token: string): Promise<Result<void>> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token),
    });
    return ok(undefined);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove FCM token';
    return fail({ code: 'notifications/token-remove-error', message });
  }
}
