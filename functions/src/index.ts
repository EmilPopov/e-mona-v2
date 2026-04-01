import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onPurchaseCreate } from './triggers/onPurchaseCreate';
export { onPurchaseDelete } from './triggers/onPurchaseDelete';
export { onPurchaseUpdate } from './triggers/onPurchaseUpdate';
