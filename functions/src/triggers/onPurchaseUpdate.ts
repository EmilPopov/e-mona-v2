import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PURCHASE_PATH = 'budgets/{budgetId}/months/{monthId}/purchases/{purchaseId}';

export const onPurchaseUpdate = onDocumentUpdated(
  PURCHASE_PATH,
  async (event) => {
    const change = event.data;
    if (!change) return;

    const beforeData = change.before.data();
    const afterData = change.after.data();

    const beforeTotal = beforeData.total as number;
    const afterTotal = afterData.total as number;

    if (beforeTotal === afterTotal) return;

    const diff = afterTotal - beforeTotal;
    if (diff === 0) return;

    const { budgetId, monthId } = event.params;
    const db = getFirestore();
    const monthRef = db.doc(`budgets/${budgetId}/months/${monthId}`);

    await monthRef.update({
      totalPurchases: FieldValue.increment(diff),
    });
  }
);
