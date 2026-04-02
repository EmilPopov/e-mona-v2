import { ref, onMounted, onUnmounted } from 'vue';
import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';

export function useOffline() {
  const isOffline = ref(false);
  let handler: PluginListenerHandle | null = null;

  onMounted(async () => {
    const status = await Network.getStatus();
    isOffline.value = !status.connected;
    handler = await Network.addListener('networkStatusChange', (s) => {
      isOffline.value = !s.connected;
    });
  });

  onUnmounted(() => {
    handler?.remove();
  });

  return { isOffline };
}
