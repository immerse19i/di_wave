<template>
  <div v-if="visible" class="file-preview-overlay" @click.self="close">
    <!-- 상단 헤더 -->
    <div class="preview-header">
      <div class="header-actions">
        <button class="header-btn" @click="zoomOut">
          <img src="/assets/icons/zoom_out.svg" alt="zoom out" />
        </button>
        <span class="header-zoom">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="header-btn" @click="zoomIn">
          <img src="/assets/icons/zoom_in.svg" alt="zoom in" />
        </button>
        <button class="header-btn download" @click="download">
          <img src="/assets/icons/download_icon.svg" alt="download" />
          <span>다운로드</span>
        </button>
        <button class="header-btn close" @click="close">
          <img src="/assets/icons/close.svg" alt="close" />
        </button>
      </div>
    </div>

    <!-- 본문 -->
    <div class="preview-body">
      <!-- 이미지 -->
      <img
        v-if="isImage"
        :src="fileUrl"
        :style="{ transform: `scale(${zoomLevel})` }"
        class="preview-image"
        alt="preview"
      />
      <!-- PDF -->
      <iframe
        v-else-if="isPdf"
        :src="pdfViewerUrl"
        class="preview-pdf"
        :style="{ transform: `scale(${zoomLevel})`, width: `${100 / zoomLevel}%`, height: `${100 / zoomLevel}%` }"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const zoomLevel = ref(1);

// 파일 타입 판별
const extension = computed(() => {
  const url = props.fileUrl || props.fileName || '';
  return url.split('.').pop().toLowerCase();
});

const isImage = computed(() => ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension.value));
const isPdf = computed(() => extension.value === 'pdf');

const pdfViewerUrl = computed(() => {
  if (!isPdf.value) return '';
  return `/pdfjs/web/viewer.html?file=${encodeURIComponent(props.fileUrl)}`;
});

// 줌
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3);
};
const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.25);
};

// 다운로드
const download = () => {
  const a = document.createElement('a');
  a.href = props.fileUrl;
  a.download = props.fileName || 'file';
  a.click();
};

// 닫기
const close = () => {
  emit('close');
};

// visible 변경 시 줌 초기화
watch(() => props.visible, (val) => {
  if (val) zoomLevel.value = 1;
});
</script>

<style lang="scss" scoped>
.file-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 70px;
  padding: 0 24px;
  background: #191919;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;

  &:hover {
    opacity: 0.8;
  }

  img {
    width: 24px;
    height: 24px;
  }

  &.download {
    gap: 6px;

    img {
      width: 16px;
      height: 16px;
    }

    span {
      @include font-14-bold;
      color: $white;
    }
  }

  &.close {
    margin-left: 12px;
  }
}

.header-zoom {
  @include font-14-bold;
  color: $white;
  min-width: 50px;
  text-align: center;
}

.preview-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.preview-image {
  max-width: 90%;
  max-height: 85vh;
  transition: transform 0.2s;
}

.preview-pdf {
  border: none;
  transition: transform 0.2s;
  transform-origin: center center;
  width: 100%;
  height: 100%;
}
</style>
