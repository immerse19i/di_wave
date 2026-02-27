<template>
  <div class="fade-loader-overlay">
    <div
      class="fade-loader"
      :style="{ width: size + 'px', height: size + 'px' }"
    >
      <div
        v-for="i in 8"
        :key="i"
        class="bar"
        :style="{
          backgroundColor: color,
          width: barWidth + 'px',
          height: barHeight + 'px',
          borderRadius: radius + 'px',
          marginLeft: -(barWidth / 2) + 'px',
          transformOrigin: '50% ' + size / 2 + 'px',
          transform: 'rotate(' + (i - 1) * 45 + 'deg)',
          animationDelay: (i - 1) * 0.12 + 's',
        }"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  color: { type: String, default: '#305b86' },
  size: { type: Number, default: 60 },
  barHeight: { type: Number, default: 15 },
  barWidth: { type: Number, default: 5 },
  radius: { type: Number, default: 2 },
});
</script>

<style scoped>
.fade-loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.fade-loader {
  position: relative;
}
.bar {
  position: absolute;
  left: 50%;
  top: 0;
  animation: fadeLoader 1.2s ease-in-out infinite both;
}
@keyframes fadeLoader {
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 1;
  }
}
</style>
