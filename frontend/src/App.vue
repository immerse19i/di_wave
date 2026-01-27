<template>
  <router-view />
  <Message />
</template>

<script setup>
import Message from '@/components/message_popup/Message.vue';
</script>

<style lang="scss">
#app {
  min-height: 100vh;
  background-color: $dark-bg;
}
</style>
