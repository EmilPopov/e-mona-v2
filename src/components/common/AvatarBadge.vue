<template>
  <div
    class="avatar-badge"
    :style="{ backgroundColor: color, width: size + 'px', height: size + 'px', fontSize: (size * 0.4) + 'px' }"
  >
    {{ initials }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  name: string;
  color: string;
  size?: number;
}>(), {
  size: 36,
});

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return props.name.slice(0, 2).toUpperCase();
});
</script>

<style scoped>
.avatar-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
  user-select: none;
}
</style>
