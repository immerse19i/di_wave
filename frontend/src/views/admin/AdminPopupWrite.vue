<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">안내팝업</h2>
      <div class="breadcrumb">
        안내팝업 &gt; 목록 &gt; {{ isEdit ? '수정' : '생성' }}
      </div>
    </div>

    <!-- 뒤로가기 -->
    <div class="back-row">
      <button class="btn-back" @click="goBack">
        <span class="arrow">&lt;</span> 뒤로가기
      </button>
    </div>

    <!-- 버튼 + 메시지 영역 -->
    <div class="action-row">
      <span v-if="statusMsg" :class="['status-msg', statusMsgType]">{{
        statusMsg
      }}</span>
      <button v-if="!isEdit" class="btn-action btn-draft" @click="handleDraft">
        임시저장
      </button>
      <button class="btn-action btn-preview" @click="handlePreview">
        미리보기
      </button>
      <button class="btn-action btn-publish" @click="handlePublish">
        {{ isEdit ? '수정완료' : '팝업생성하기' }}
      </button>
    </div>

    <!-- 제목 -->
    <div class="form-group">
      <label class="form-label">제목</label>
      <input
        v-model="form.title"
        type="text"
        class="form-input"
        placeholder="제목을 입력해 주세요"
      />
    </div>

    <!-- 내용 (CKEditor) -->
    <div class="form-group">
      <label class="form-label">내용</label>
      <div class="editor-wrap">
        <ckeditor
          :editor="editor"
          v-model="form.content"
          :config="editorConfig"
        />
      </div>
    </div>

    <!-- 팝업크기 -->
    <div class="form-row">
      <label class="form-label row-label">팝업크기</label>
      <div class="size-inputs">
        <span class="size-label">가로</span>
        <input
          v-model.number="form.popup_width"
          type="number"
          class="size-input"
          @blur="validateSize('width')"
        />
        <span class="size-unit">px</span>
        <span class="size-label">세로</span>
        <input
          v-model.number="form.popup_height"
          type="number"
          class="size-input"
          @blur="validateSize('height')"
        />
        <span class="size-unit">px</span>
        <span class="size-hint"
          >설정하지 않은 경우 기본값(500*400)으로 설정됩니다.<br />최소사이즈
          300*200 / 최대사이즈 1,000*800</span
        >
      </div>
    </div>

    <!-- 상태 (수정모드만) -->
    <div v-if="isEdit" class="form-row">
      <label class="form-label row-label">상태</label>
      <div class="radio-group">
        <label class="radio-label">
          <input type="radio" v-model="form.status" value="published" /> 게시중
        </label>
        <label class="radio-label">
          <input type="radio" v-model="form.status" value="draft" /> 게시중지
        </label>
      </div>
    </div>

    <!-- 게시기간 -->
    <div class="form-row">
      <label class="form-label row-label">게시기간</label>
      <div class="period-inputs">
        <input
          v-model="form.display_start"
          type="date"
          class="date-input"
          :disabled="form.is_always"
        />
        <span class="date-sep">-</span>
        <input
          v-model="form.display_end"
          type="date"
          class="date-input"
          :disabled="form.is_always"
        />
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.is_always" /> 상시
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import { Ckeditor as CkeditorComponent } from '@ckeditor/ckeditor5-vue';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  List,
  Alignment,
  Link,
  Image,
  ImageUpload,
  Base64UploadAdapter,
  FontColor,
  FontBackgroundColor,
  FontSize,
  FontFamily,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';

const router = useRouter();
const route = useRoute();
const message = UseMessageStore();
const props = defineProps({ id: [String, Number] });

const ckeditor = CkeditorComponent;
const editor = ClassicEditor;
const editorConfig = {
  licenseKey: 'GPL',
  plugins: [
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Underline,
    List,
    Alignment,
    Link,
    Image,
    ImageUpload,
    Base64UploadAdapter,
    FontColor,
    FontBackgroundColor,
    FontSize,
    FontFamily,
  ],
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'underline',
    '|',
    'fontSize',
    'fontFamily',
    '|',
    'fontColor',
    'fontBackgroundColor',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'alignment',
    '|',
    'link',
    'imageUpload',
    '|',
    'undo',
    'redo',
  ],
  fontSize: { options: [9, 11, 13, 'default', 17, 19, 21, 27, 35] },
  language: 'ko',
};

// ---- 모드 ----
const isEdit = computed(() => !!props.id);

// ---- 폼 데이터 ----
const today = new Date().toISOString().slice(0, 10);
const form = ref({
  title: '',
  content: '',
  popup_width: 500,
  popup_height: 400,
  status: 'published',
  display_start: today,
  display_end: today,
  is_always: true,
});

// ---- 변경 감지 ----
const snapshot = ref('');
const hasChanges = computed(
  () => JSON.stringify(form.value) !== snapshot.value,
);
const takeSnapshot = () => {
  snapshot.value = JSON.stringify(form.value);
};

// ---- 상태 메시지 ----
const statusMsg = ref('');
const statusMsgType = ref('success');
let msgTimer = null;

const showStatusMsg = (msg, type = 'success', duration = 5000) => {
  statusMsg.value = msg;
  statusMsgType.value = type;
  if (msgTimer) clearTimeout(msgTimer);
  if (duration > 0) {
    msgTimer = setTimeout(() => {
      statusMsg.value = '';
    }, duration);
  }
};

// ---- 팝업크기 유효성 ----
const validateSize = (dimension) => {
  const minW = 300,
    maxW = 1000,
    minH = 200,
    maxH = 800;
  const w = form.value.popup_width;
  const h = form.value.popup_height;

  if (dimension === 'width' && (w < minW || w > maxW)) {
    message.showAlert('최소 300*200px, 최대 1000*800px까지 가능합니다.');
    form.value.popup_width = 500;
  }
  if (dimension === 'height' && (h < minH || h > maxH)) {
    message.showAlert('최소 300*200px, 최대 1000*800px까지 가능합니다.');
    form.value.popup_height = 400;
  }
};

// ---- 데이터 로드 (수정모드) ----
const loadPopup = async () => {
  try {
    const res = await adminAPI.getPopupDetail(props.id);
    const d = res.data.data;
    form.value.title = d.title || '';
    form.value.content = d.content || '';
    form.value.popup_width = d.popup_width || 500;
    form.value.popup_height = d.popup_height || 400;
    form.value.status = d.status || 'published';
    form.value.is_always = !!d.is_always;
    form.value.display_start = d.display_start
      ? d.display_start.slice(0, 10)
      : today;
    form.value.display_end = d.display_end ? d.display_end.slice(0, 10) : today;
    takeSnapshot();
  } catch (e) {
    message.showAlert('데이터를 불러올 수 없습니다.');
    router.push('/admin/popups');
  }
};

// ---- 임시저장 (생성모드만) ----
const handleDraft = async () => {
  try {
    const data = { ...form.value, status: 'draft' };
    const res = await adminAPI.createPopup(data);
    showStatusMsg('임시저장되었습니다.');
    const newId = res.data.data.id;
    form.value.status = 'draft'; // ← 이 줄 추가
    takeSnapshot();
    router.replace(`/admin/popups/${newId}`);
  } catch (e) {
    showStatusMsg('저장에 실패했습니다.', 'error', 0);
  }
};

// ---- 미리보기 ----
const handlePreview = () => {
  const w = form.value.popup_width || 500;
  const h = form.value.popup_height || 400;

  const win = window.open(
    '',
    '_blank',
    `width=${w},height=${h},scrollbars=yes,resizable=no`,
  );
  if (!win) {
    message.showAlert('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>${form.value.title || '미리보기'}</title>
    <style>body{margin:0;padding:16px;font-family:'Pretendard',sans-serif;background:#fff;color:#222;}</style>
    </head><body>${form.value.content || '<p style="color:#999;">내용이 없습니다.</p>'}</body></html>`);
  win.document.close();
};
const stripHtml = (html) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .trim();

// ---- 게시 / 수정완료 ----
const handlePublish = async () => {
  if (!form.value.title.trim() || !stripHtml(form.value.content)) {
    showStatusMsg('제목, 내용을 입력해 주세요', 'error', 0);
    return;
  }

  try {
    if (isEdit.value) {
      // 수정모드: 상태 라디오 값 사용
      await adminAPI.updatePopup(props.id, form.value);
    } else {
      // 생성모드: published로 설정
      const data = { ...form.value, status: 'published' };
      await adminAPI.createPopup(data);
    }
    router.push('/admin/popups');
  } catch (e) {
    showStatusMsg('저장에 실패했습니다.', 'error', 0);
  }
};

// ---- 뒤로가기 ----
const goBack = () => {
  router.push('/admin/popups');
};

// ---- 나가기 경고 ----
const beforeUnloadHandler = (e) => {
  if (hasChanges.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

onBeforeRouteLeave((to, from, next) => {
  if (hasChanges.value) {
    const answer = window.confirm(
      '변경사항이 저장되지 않을 수 있습니다.\n사이트에서 나가시겠습니까?',
    );
    next(answer);
  } else {
    next();
  }
});

// ---- 초기화 ----
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnloadHandler);
  if (isEdit.value) {
    await loadPopup();
  } else {
    takeSnapshot();
  }
});
onUnmounted(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler);
  if (msgTimer) clearTimeout(msgTimer);
});
</script>

<style lang="scss" scoped>
.page-wrap {
  padding: 32px 42px;
  color: $white;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  .page-title {
    @include font-20-bold;
  }
  .breadcrumb {
    @include font-12-regular;
    color: $dark-text;
  }
}

.back-row {
  margin-bottom: 16px;
  .btn-back {
    background: none;
    border: none;
    color: $dark-text;
    @include font-14-regular;
    cursor: pointer;
    .arrow {
      margin-right: 4px;
    }
    &:hover {
      color: $white;
    }
  }
}

// 버튼 + 메시지
.action-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;

  .status-msg {
    @include font-14-regular;
    margin-right: auto;
    &.success {
      color: $dark-text;
    }
    &.error {
      color: #e57373;
    }
  }

  .btn-action {
    min-width: 120px;
    padding: 10px 24px;
    border: none;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
    color: $white;
  }
  .btn-draft {
    background: $bg-op;
    border: 1px solid $dark-line-gray;
  }
  .btn-preview {
    background: $main-gad;
  }
  .btn-publish {
    background: $main-color;
    &:hover {
      background: $sub-color;
    }
  }
}

// 폼
.form-group {
  margin-bottom: 24px;
}
.form-label {
  display: block;
  @include font-14-bold;
  margin-bottom: 8px;
}
.form-input {
  width: 100%;
  padding: 12px 16px;
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  box-sizing: border-box;
  &::placeholder {
    color: $dark-input-gray;
  }
  &:focus {
    border-color: $main-color;
    outline: none;
  }
}

// CKEditor
.editor-wrap {
  :deep(.ck.ck-editor) {
    .ck-toolbar {
      background: $bg-op;
      border-color: $dark-line-gray;
    }
    .ck-toolbar__items .ck-button {
      color: $white;
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      &.ck-on {
        background: $main-color;
        color: $white;
      }
    }
    .ck-toolbar__separator {
      background: $dark-line-gray;
    }
    .ck-dropdown__panel {
      background: $bg-op;
      border-color: $dark-line-gray;
    }
    .ck-editor__editable {
      min-height: 300px;
      background: $dark-input;
      color: $white;
      border-color: $dark-line-gray;
      &.ck-focused {
        border-color: $main-color;
      }
    }
  }
}

// 가로 폼 행
.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  .row-label {
    min-width: 80px;
    margin-bottom: 0;
  }
}

// 팝업크기
.size-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .size-label {
    @include font-14-regular;
    color: $dark-text;
  }
  .size-input {
    width: 100px;
    padding: 8px 12px;
    background: $dark-input;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-sm;
    color: $white;
    @include font-14-regular;
    &:focus {
      border-color: $main-color;
      outline: none;
    }
    // 스피너 숨김
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    -moz-appearance: textfield;
  }
  .size-unit {
    @include font-14-regular;
    color: $dark-text;
  }
  .size-hint {
    @include font-12-regular;
    color: $dark-text;
    margin-left: 8px;
  }
}

// 라디오
.radio-group {
  display: flex;
  gap: 16px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  @include font-14-regular;
  cursor: pointer;
  input[type='radio'] {
    accent-color: $main-color;
  }
}

// 게시기간
.period-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  .date-input {
    padding: 8px 12px;
    background: $dark-input;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-sm;
    color: $white;
    @include font-14-regular;
    &:focus {
      border-color: $main-color;
      outline: none;
    }
    &:disabled {
      opacity: 0.4;
    }
    &::-webkit-calendar-picker-indicator {
      filter: invert(1);
    }
  }
  .date-sep {
    color: $dark-text;
  }
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  @include font-14-regular;
  cursor: pointer;
  input[type='checkbox'] {
    accent-color: $main-color;
  }
}
</style>
