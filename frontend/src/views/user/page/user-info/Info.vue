<template>
  <div class="info-page">
    <h2 class="info-title">{{ info.title }}</h2>
    <div class="info-content" v-html="info.content"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api/index';

const info = ref({ title: '', content: '' });

onMounted(async () => {
  try {
    const res = await api.get('/info');
    info.value = res.data.data;
  } catch (e) {
    console.error('info load error:', e);
  }
});
</script>

<style lang="scss" scoped>
.info-page {
  padding: 24px 0;
}
.info-title {
  font-size: 44px;
  font-weight: 700;
  color: $white;
  margin-bottom: 24px;
}
.info-content {
  @include font-14-regular;
  line-height: 1.8;
  color: $dark-text;
}
</style>
