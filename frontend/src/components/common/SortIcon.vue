<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="sort-icon"
  >
    <path
      class="arrow-up"
      :class="{ active: normalized === 'ASC' }"
      d="M5.26172 6.40658L8.00082 3.66748L10.7399 6.40658"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      class="arrow-down"
      :class="{ active: normalized === 'DESC' }"
      d="M10.7399 9.59277L8.00082 12.3319L5.26172 9.59277"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 'ASC' | 'DESC' | 'asc' | 'desc' | '' | null
  direction: {
    type: String,
    default: '',
  },
});

const normalized = computed(() =>
  props.direction ? props.direction.toUpperCase() : '',
);
</script>

<style lang="scss" scoped>
.sort-icon {
  .arrow-up,
  .arrow-down {
    stroke: $white;
    transition: stroke 0.15s;
    &.active {
      stroke: $sub-color-2;
    }
  }
}
</style>
