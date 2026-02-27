<template>
  <div v-if="isRouteLoading">
    <FadeLoader />
  </div>
  <router-view />
  <Message />
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Message from '@/components/message_popup/Message.vue';
import FadeLoader from '@/components/common/FadeLoader.vue';

const router = useRouter();
const isRouteLoading = ref(false);

router.beforeEach(() => {
  isRouteLoading.value = true;
});

router.afterEach(() => {
  isRouteLoading.value = false;
});
</script>

<style lang="scss">
#app {
  min-height: 100vh;
  background-color: $dark-bg;
}
</style>
