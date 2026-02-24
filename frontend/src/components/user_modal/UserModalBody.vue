<template>
  <div id="modal" class="modal-overlay" v-if="modal.isOpen" @click.self="handleClose">
    <div class="modal-content">
      <div class="close-btn" @click="handleClose">
        <img :src="closeIcon" alt="" />
      </div>
      <component 
        :is="currentComponent" 
        :ref="modal.type === 'find_id' ? (el) => findIdRef = el : 
              modal.type === 'find_password' ? (el) => findPasswordRef = el : undefined"
      />
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
import { computed, ref } from 'vue';
import { useModalStore } from '../../store/modal';
import { UseMessageStore } from '../../store/message';
import SignIn from './modal/SignIn.vue';
import FindId from './modal/FindId.vue';
import FindPassword from './modal/FindPassword.vue';

const modal = useModalStore();
const message = UseMessageStore();
const closeIcon = '/assets/icons/close.svg';

const findIdRef = ref(null);
const findPasswordRef = ref(null);

const components = {
  'sign-in': SignIn,
  find_id: FindId,
  find_password: FindPassword,
};

const currentComponent = computed(() => components[modal.type]);

const handleClose = () => {
  // find_id 모달의 1~2단계에서는 confirm 팝업
  if (modal.type === 'find_id' && findIdRef.value?.step < 3) {
    message.showConfirm('ID찾기를 중단하시겠습니까?', () => {
      modal.close();
    });
    return;
  }
  // 그 외에는 즉시 닫기
  modal.close();
};
</script>