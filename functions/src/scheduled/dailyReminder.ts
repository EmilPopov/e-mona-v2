import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Daily reminder — runs once daily at 20:00 UTC.
 * Sends push notifications to users who have dailyReminder enabled.
 *
 * Logic:
 * 1. Query all users with dailyReminder = true and at least one FCM token
 * 2. For each user, check if they have purchases today
 * 3. Send appropriate message
 */
export const dailyReminder = onSchedule(
  {
    schedule: '0 20 * * *', // 20:00 UTC daily
    timeZone: 'UTC',
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();

    // Get all users who want daily reminders
    const usersSnapshot = await db
      .collection('users')
      .where('notificationPrefs.dailyReminder', '==', true)
      .get();

    if (usersSnapshot.empty) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const monthId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const tokens: string[] = userData.fcmTokens ?? [];
      if (tokens.length === 0) continue;

      const budgetId = userData.activeBudgetId as string | null;
      if (!budgetId) continue;

      // Check if user has purchases today
      let body: string;
      try {
        const purchasesSnapshot = await db
          .collection(`budgets/${budgetId}/months/${monthId}/purchases`)
          .where('createdBy', '==', userDoc.id)
          .where('date', '==', todayStr)
          .limit(1)
          .get();

        if (purchasesSnapshot.empty) {
          body = "Don't forget to log today's expenses!";
        } else {
          // Get today's total for this user
          const allTodayPurchases = await db
            .collection(`budgets/${budgetId}/months/${monthId}/purchases`)
            .where('createdBy', '==', userDoc.id)
            .where('date', '==', todayStr)
            .get();

          let todayTotal = 0;
          for (const p of allTodayPurchases.docs) {
            todayTotal += (p.data().total as number) ?? 0;
          }

          const formatted = (todayTotal / 100).toFixed(2);
          body = `You've spent €${formatted} today. Keep tracking!`;
        }
      } catch {
        body = "Don't forget to log today's expenses!";
      }

      for (const token of tokens) {
        messages.push({
          token,
          notification: {
            title: 'e-mona',
            body,
          },
          data: {
            type: 'daily_reminder',
            click_action: 'NEW_PURCHASE',
          },
        });
      }
    }

    if (messages.length === 0) return;

    // Send in batches (FCM limit is 500 per batch)
    const batchSize = 500;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const response = await messaging.sendEach(batch);

      // Clean up invalid tokens
      for (let j = 0; j < response.responses.length; j++) {
        const resp = response.responses[j];
        if (
          !resp.success &&
          resp.error &&
          (resp.error.code === 'messaging/registration-token-not-registered' ||
           resp.error.code === 'messaging/invalid-registration-token')
        ) {
          const failedToken = batch[j].token;
          // Find which user has this token and remove it
          const tokenUser = usersSnapshot.docs.find((d) =>
            (d.data().fcmTokens as string[])?.includes(failedToken)
          );
          if (tokenUser) {
            const updatedTokens = ((tokenUser.data().fcmTokens as string[]) ?? []).filter(
              (t: string) => t !== failedToken
            );
            await tokenUser.ref.update({ fcmTokens: updatedTokens });
          }
        }
      }
    }
  }
);
