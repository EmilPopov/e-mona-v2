import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import type { CurrencyCode } from '@/types/types';

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
};

export function useCurrency() {
  const authStore = useAuthStore();

  const currencyCode = computed<CurrencyCode>(
    () => authStore.user?.currency ?? 'EUR',
  );

  const formatter = computed(() =>
    new Intl.NumberFormat(CURRENCY_LOCALE[currencyCode.value], {
      style: 'currency',
      currency: currencyCode.value,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );

  /** Format cents to display string: 1250 → "€12.50" */
  function format(amountInCents: number): string {
    return formatter.value.format(amountInCents / 100);
  }

  /** Convert display amount to cents: 12.50 → 1250 */
  function toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  /** Convert cents to display amount: 1250 → 12.50 */
  function fromCents(cents: number): number {
    return cents / 100;
  }

  return { currencyCode, format, toCents, fromCents };
}
