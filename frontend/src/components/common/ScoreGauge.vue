<template>
  <div class="score-gauge-wrap">
    <svg viewBox="0 0 160 90" class="gauge-svg">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00BCD4" />
          <stop offset="100%" stop-color="#2196F3" />
        </linearGradient>
      </defs>
      <!-- 배경 반원 (회색) -->
      <path
        d="M 20 80 A 60 60 0 0 1 140 80"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        :stroke-width="strokeWidth"
        stroke-linecap="butt"
      />
      <!-- 점수 게이지 (그라데이션) -->
      <path
        d="M 20 80 A 60 60 0 0 1 140 80"
        fill="none"
        :stroke="`url(#${gradientId})`"
        :stroke-width="strokeWidth"
        stroke-linecap="butt"
        :stroke-dasharray="arcLength"
        :stroke-dashoffset="dashOffset"
        class="gauge-fill"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  score: { type: Number, default: 0 },
  id: { type: String, default: 'gauge' },
});

const strokeWidth = 16;
const gradientId = computed(() => `gradient-${props.id}`);
const arcLength = Math.PI * 60; // ≈ 188.5
const dashOffset = computed(
  () => arcLength * (1 - Math.min(props.score, 100) / 100),
);
</script>

<style scoped>
.score-gauge-wrap {
  display: flex;
  justify-content: center;
}
.gauge-svg {
  width: 140px;
  height: auto;
}
.gauge-fill {
  transition: stroke-dashoffset 0.8s ease;
}
</style>
