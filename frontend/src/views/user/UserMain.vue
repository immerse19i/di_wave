<template>
  <Header />
  <main class="content">
    <router-view />
  </main>
  <PageModalBody v-if="modal.isOpen && modal.role === 'page'" />
</template>

<script setup>
import Header from '../../components/common/Header.vue';
import PageModalBody from '@/components/page_modal/PageModalBody.vue';
import { useModalStore } from '@/store/modal';

const modal = useModalStore();
</script>

<style lang="scss" scoped></style>
