<template>
  <div
    id="message"
    class="message-overlay"
    v-if="message.isOpen"
    @click.self="message.close"
  >
    <div class="message-content">
      <!-- 동적 컴포넌트 -->
      <p>{{ message.text }}</p>
      <p v-if="message.timer > 0">
        {{ message.timer }}초 후에 다시 시도 해주세요
      </p>
    </div>
  </div>
</template>

<script setup>
import { UseMessageStore } from '@/store/message';

const message = UseMessageStore();
</script>
<style lang="scss" scoped>
.message-overlay {
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  position: fixed;
  background-color: #00000066;
}
.message-content {
  max-width: 650px;
  background-color: $dark-bg;
  padding: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
