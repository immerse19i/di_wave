<template>
  <div
    id="message"
    class="message-overlay"
    v-if="message.isOpen"
    @click.self="message.type === 'timer' ? message.close() : null"
  >
    <div class="message-content">
      <p class="message-text">{{ message.text }}</p>

      <!-- 타이머 -->
      <p v-if="message.type === 'timer'" class="message-timer">
        {{ message.timer }}초 후에 다시 시도 해주세요
      </p>

      <!-- 단순 알림 -->
      <div v-if="message.type === 'alert'" class="message-actions">
        <button class="btn-confirm" @click="message.confirm()">확인</button>
      </div>

      <!-- 예/아니오 -->
      <div v-if="message.type === 'confirm'" class="message-actions">
        <button class="btn-cancel" @click="message.cancel()">아니오</button>
        <button class="btn-confirm" @click="message.confirm()">예</button>
      </div>
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
  z-index: 1000;
}

.message-content {
  min-width: 360px;
  max-width: 480px;
  background-color: $dark-bg;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-md;
  padding: 40px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.message-text {
  color: $white;
  @include font-16-regular;
  line-height: 1.6;
  white-space: pre-line;
}

.message-timer {
  color: $gray;
  @include font-14-regular;
  margin-top: 12px;
}

.message-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.btn-confirm {
  padding: 12px 40px;
  background: $main-color;
  border: none;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-medium;
  cursor: pointer;

  &:hover {
    background: $sub-color;
  }
}

.btn-cancel {
  padding: 12px 40px;
  background: transparent;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $dark-text;
  @include font-14-medium;
  cursor: pointer;

  &:hover {
    border-color: $sub-color-2;
    color: $white;
  }
}
</style>
