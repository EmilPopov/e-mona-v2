import { toastController } from '@ionic/vue';
import type { AppError } from '@/types';

export function useToast() {
  async function showSuccess(message: string): Promise<void> {
    const toast = await toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }

  async function showError(error: AppError | string): Promise<void> {
    const message = typeof error === 'string' ? error : error.message;
    const toast = await toastController.create({
      message,
      duration: 5000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }

  async function showInfo(message: string): Promise<void> {
    const toast = await toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'primary',
    });
    await toast.present();
  }

  return { showSuccess, showError, showInfo };
}
