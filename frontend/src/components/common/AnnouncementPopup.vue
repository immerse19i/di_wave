<template>
  <div v-if="visiblePopups.length > 0" class="popup-overlay">
    <div
      v-for="(popup, index) in visiblePopups"
      :key="popup.id"
      class="popup-window"
      :style="{
        width: popup.popup_width + 'px',
        maxHeight: popup.popup_height + 'px',
        zIndex: 500 + index,
      }"
    >
      <!-- 타이틀바 -->
      <div class="popup-titlebar">
        <span class="popup-title">{{ popup.title }}</span>
        <div class="titlebar-buttons">
          <button class="titlebar-btn minimize" @click="closePopup(popup.id, false)">
            <span>&minus;</span>
          </button>
          <button class="titlebar-btn maximize">
            <span>&#9633;</span>
          </button>
          <button class="titlebar-btn close" @click="closePopup(popup.id, false)">
            <span>&times;</span>
          </button>
        </div>
      </div>

      <!-- 본문 -->
      <div class="popup-body" :style="{ maxHeight: (popup.popup_height - 80) + 'px' }">
        <div class="popup-content" v-html="popup.content"></div>
      </div>

      <!-- 하단 -->
      <div class="popup-footer">
        <label class="today-check">
          <input type="checkbox" @change="closePopup(popup.id, true)" />
          <span>오늘 하루 보지 않기</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { adminAPI } from '@/api/admin';

const popups = ref([]);
const closedIds = ref([]);

// 오늘 날짜 키
const todayKey = new Date().toISOString().slice(0, 10);

// localStorage에서 오늘 숨긴 팝업 ID 목록
function getHiddenIds() {
  try {
    const stored = localStorage.getItem('hiddenPopups');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (parsed.date !== todayKey) return [];
    return parsed.ids || [];
  } catch {
    return [];
  }
}

function setHiddenId(popupId) {
  const ids = getHiddenIds();
  if (!ids.includes(popupId)) ids.push(popupId);
  localStorage.setItem('hiddenPopups', JSON.stringify({ date: todayKey, ids }));
}

// 표시할 팝업 (숨긴 것 제외)
const visiblePopups = ref([]);

function updateVisible() {
  const hidden = getHiddenIds();
  visiblePopups.value = popups.value.filter(
    (p) => !hidden.includes(p.id) && !closedIds.value.includes(p.id)
  );
}

// 팝업 닫기
function closePopup(popupId, hideToday) {
  if (hideToday) {
    setHiddenId(popupId);
  }
  closedIds.value.push(popupId);
  updateVisible();
}

// 팝업 조회
onMounted(async () => {
  try {
    const res = await adminAPI.getActivePopups();
    popups.value = res.data.data || [];
    updateVisible();
  } catch (e) {
    // 팝업 조회 실패 시 무시
  }
});
</script>

<style lang="scss" scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 500;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 40px;
}

.popup-window {
  pointer-events: auto;
  background: #414A58;
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #D3E3FD;
  flex-shrink: 0;
}

.popup-title {
  @include font-14-bold;
  color: $black;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.titlebar-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.titlebar-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: $black;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;

  &:hover {
    opacity: 0.7;
  }

  &.close:hover {
    background: #e74c3c;
    color: $white;
  }
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #414A58;
  color: $white;

  .popup-content {
    @include font-14-regular;
    line-height: 1.6;
    word-break: break-word;

    :deep(img) {
      max-width: 100%;
      height: auto;
    }
  }
}

.popup-footer {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #414A58;
}

.today-check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  input[type='checkbox'] {
    width: 14px;
    height: 14px;
    accent-color: $main-color;
    cursor: pointer;
  }

  span {
    @include font-12-regular;
    color: $dark-text;
  }
}
</style>
