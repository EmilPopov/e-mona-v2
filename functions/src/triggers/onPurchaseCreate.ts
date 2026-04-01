import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PURCHASE_PATH = 'budgets/{budgetId}/months/{monthId}/purchases/{purchaseId}';

export const onPurchaseCreate = onDocumentCreated(
  PURCHASE_PATH,
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const total = data.total as number;

    if (typeof total !== 'number' || total === 0) return;

    const { budgetId, monthId } = event.params;
    const db = getFirestore();
    const monthRef = db.doc(`budgets/${budgetId}/months/${monthId}`);

    await monthRef.update({
      totalPurchases: FieldValue.increment(total),
    });
  }
);
