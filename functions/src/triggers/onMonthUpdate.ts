import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const MONTH_PATH = 'budgets/{budgetId}/months/{monthId}';

/**
 * Budget alert trigger — fires when a month document is updated.
 * Checks if spending crossed 80% or 100% thresholds and sends alerts.
 *
 * Alert tracking:
 * - alerts.eightyPercentSent: prevents re-sending the 80% warning
 * - alerts.overspentSent: prevents re-sending the overspent alert
 */
export const onMonthUpdate = onDocumentUpdated(
  MONTH_PATH,
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const totalPurchases = after.totalPurchases as number;
    const spendingBudget = after.spendingBudget as number;

    // No budget set or no spending — nothing to alert
    if (!spendingBudget || spendingBudget <= 0 || !totalPurchases) return;

    const alerts = (after.alerts as { eightyPercentSent?: boolean; overspentSent?: boolean }) ?? {};
    const { budgetId, monthId } = event.params;
    const db = getFirestore();
    const messaging = getMessaging();

    // Parse month label from monthId (e.g. "2026-04" → "April")
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthNum = parseInt(monthId.split('-')[1], 10);
    const monthName = monthNames[monthNum - 1] ?? monthId;

    const spentPercent = totalPurchases / spendingBudget;
    let alertType: '80' | 'overspent' | null = null;
    let alertBody = '';

    // Check overspent first (higher priority)
    if (spentPercent >= 1 && !alerts.overspentSent) {
      const overBy = ((totalPurchases - spendingBudget) / 100).toFixed(2);
      alertBody = `You've exceeded your ${monthName} spending budget by €${overBy}.`;
      alertType = 'overspent';
    } else if (spentPercent >= 0.8 && spentPercent < 1 && !alerts.eightyPercentSent) {
      const remaining = ((spendingBudget - totalPurchases) / 100).toFixed(2);
      alertBody = `You've used 80% of your ${monthName} budget. €${remaining} remaining.`;
      alertType = '80';
    }

    if (!alertType) return;

    // Mark alert as sent to prevent re-sending
    const monthRef = db.doc(`budgets/${budgetId}/months/${monthId}`);
    const updateData: Record<string, boolean> = {};
    if (alertType === 'overspent') {
      updateData['alerts.overspentSent'] = true;
    }
    if (alertType === '80' || alertType === 'overspent') {
      updateData['alerts.eightyPercentSent'] = true;
    }
    await monthRef.update(updateData);

    // Get all budget members who have budgetAlerts enabled
    const budgetDoc = await db.doc(`budgets/${budgetId}`).get();
    if (!budgetDoc.exists) return;

    const budgetData = budgetDoc.data();
    const memberIds: string[] = budgetData?.memberIds ?? [];

    if (memberIds.length === 0) return;

    // Fetch user docs for all members
    const userDocs = await Promise.all(
      memberIds.map((uid) => db.doc(`users/${uid}`).get())
    );

    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];

    for (const userDoc of userDocs) {
      if (!userDoc.exists) continue;
      const userData = userDoc.data();
      if (!userData) continue;

      // Check if user wants budget alerts
      if (!userData.notificationPrefs?.budgetAlerts) continue;

      const tokens: string[] = userData.fcmTokens ?? [];
      for (const token of tokens) {
        messages.push({
          token,
          notification: {
            title: 'e-mona',
            body: alertBody,
          },
          data: {
            type: 'budget_alert',
            alertLevel: alertType,
          },
        });
      }
    }

    if (messages.length === 0) return;

    // Send notifications
    const response = await messaging.sendEach(messages);

    // Clean up invalid tokens
    for (let j = 0; j < response.responses.length; j++) {
      const resp = response.responses[j];
      if (
        !resp.success &&
        resp.error &&
        (resp.error.code === 'messaging/registration-token-not-registered' ||
         resp.error.code === 'messaging/invalid-registration-token')
      ) {
        const failedToken = messages[j].token;
        const tokenUser = userDocs.find((d) =>
          d.exists && (d.data()?.fcmTokens as string[])?.includes(failedToken)
        );
        if (tokenUser) {
          const updatedTokens = ((tokenUser.data()?.fcmTokens as string[]) ?? []).filter(
            (t: string) => t !== failedToken
          );
          await tokenUser.ref.update({ fcmTokens: updatedTokens });
        }
      }
    }
  }
);
