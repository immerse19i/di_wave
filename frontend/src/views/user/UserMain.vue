<template>
  <Header />
  <main class="content">
    <router-view />
    <!-- <UserFooter /> -->
    <LoginFooter />
  </main>
  <PageModalBody v-if="modal.isOpen && modal.role === 'page'" />
  <AnnouncementPopup />
</template>

<script setup>
import Header from '../../components/common/Header.vue';
import UserFooter from '../../components/common/UserFooter.vue';
import LoginFooter from '../../components/common/LoginFooter.vue';
import PageModalBody from '@/components/page_modal/PageModalBody.vue';
import AnnouncementPopup from '@/components/common/AnnouncementPopup.vue';
import { useModalStore } from '@/store/modal';

const modal = useModalStore();
</script>

<style lang="scss" scoped>
.content {
  min-height: calc(100vh - 217px);
  // background: $bg-op;
}
</style>
