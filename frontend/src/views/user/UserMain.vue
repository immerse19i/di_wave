<template>
  <Header />
  <main class="content">
    <router-view />
    <UserFooter />
  </main>
  <PageModalBody v-if="modal.isOpen && modal.role === 'page'" />
</template>

<script setup>
import Header from '../../components/common/Header.vue';
import UserFooter from '../../components/common/UserFooter.vue';
import PageModalBody from '@/components/page_modal/PageModalBody.vue';
import { useModalStore } from '@/store/modal';

const modal = useModalStore();
</script>

<style lang="scss" scoped>
.content {
  min-height: calc(100vh - 140px);
  // background: $bg-op;
}
</style>
