<template>
  <div
    id="modal"
    class="modal-overlay"
    v-if="modal.isOpen"
    @click.self="modal.close"
  >
    <div class="modal-content">
      <!-- 동적 컴포넌트 -->
      <div class="close-btn">
        <img :src="closeIcon" alt="" />
      </div>
      <component :is="currentComponent" />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.modal-overlay {
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  position: fixed;
  background-color: #00000066;
}
.modal-content {
  max-width: 650px;
  background-color: $dark-bg;
  padding: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  .close-btn {
    display: flex;
    justify-content: right;
    cursor: pointer;
    margin-bottom: $spacing-xs;
  }
}
</style>
<script setup>
import { computed } from 'vue';
import { useModalStore } from '../../store/modal';
// 모달목록
import SignIn from './modal/SignIn.vue';
import FindId from './modal/FindId.vue';
import FindPassword from './modal/FindPassword.vue';
const modal = useModalStore();

const closeIcon = '/assets/icons/close.svg';

const components = {
  'sign-in': SignIn,
  find_id: FindId,
  find_password: FindPassword,
};

const currentComponent = computed(() => components[modal.type]);
</script>
