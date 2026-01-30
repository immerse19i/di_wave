<template>
  <div
    id="page-modal"
    class="modal-overlay"
    v-if="modal.isOpen"
    @click.self="modal.close"
  >
    <div class="modal-content">
      <div class="close-btn" @click="modal.close">
        <img :src="closeIcon" alt="" />
      </div>
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useModalStore } from '../../store/modal';
// 모달목록
import NewAnalysis from './modal/NewAnalysis.vue';

const modal = useModalStore();

const closeIcon = '/assets/icons/close.svg';

const components = {
  new_analysis: NewAnalysis,
};

const currentComponent = computed(() => components[modal.type]);
</script>

<style lang="scss" scoped>
.modal-overlay {
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  position: fixed;
  background-color: #00000066;
  z-index: 100;
}
.modal-content {
  background-color: $dark-bg;
  padding: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: $radius-md;

  .close-btn {
    display: flex;
    justify-content: right;
    cursor: pointer;
    margin-bottom: $spacing-xs;
  }
}
</style>
