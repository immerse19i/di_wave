<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h2 class="page-title">고객문의관리</h2>
      <div class="breadcrumb">고객문의관리 &gt; 목록 &gt; 문의상세</div>
    </div>

    <div class="detail-area" v-if="inquiry">
      <!-- ① 뒤로가기 -->
      <div class="back-row">
        <button class="btn-back" @click="goBack">
          <img
            src="/assets/icons/arrow_prev.svg"
            alt="back"
            width="12"
            height="12"
          />
          뒤로가기
        </button>
      </div>

      <!-- ② 문의 상세 정보 -->
      <div class="inquiry-section">
        <h1 class="inquiry-title">{{ inquiry.title }}</h1>
        <p class="inquiry-meta">
          {{ inquiry.hospital_name }} ({{ inquiry.login_id }})
          <span class="meta-divider">|</span>
          {{ formatDateTime(inquiry.created_at) }}
        </p>
        <div class="inquiry-content" v-html="inquiry.content"></div>

        <!-- ③ 고객 첨부파일 -->
        <div
          class="attachment-list"
          v-if="inquiry.attachments && inquiry.attachments.length > 0"
        >
          <div
            v-for="file in inquiry.attachments"
            :key="file.id"
            class="attachment-item"
            @click="previewFile(file)"
          >
            <img
              v-if="isImageFile(file.file_type)"
              :src="getFileUrl(file.file_path)"
              class="attach-thumb"
              alt="thumb"
            />
            <div v-else class="attach-icon">
              <img
                src="/assets/icons/attachment.svg"
                alt="file"
                width="24"
                height="24"
              />
            </div>
            <span class="attach-name">{{ file.file_name }}</span>
          </div>
        </div>
      </div>

      <hr class="divider" />

      <!-- 답변완료 상태: 읽기 전용 -->
      <template v-if="inquiry.status === 'answered'">
        <div class="answer-section">
          <h2 class="answer-title">답변완료</h2>
          <p class="answer-date">
            답변일 {{ formatDateTime(inquiry.answered_at) }}
          </p>
          <div class="answer-content" v-html="inquiry.answer"></div>

          <!-- 답변 첨부파일 (읽기 전용) -->
          <div
            class="attachment-list"
            v-if="
              inquiry.answer_attachments &&
              inquiry.answer_attachments.length > 0
            "
          >
            <div
              v-for="file in inquiry.answer_attachments"
              :key="file.id"
              class="attachment-item"
              @click="previewFile(file)"
            >
              <img
                v-if="isImageFile(file.file_type)"
                :src="getFileUrl(file.file_path)"
                class="attach-thumb"
                alt="thumb"
              />
              <div v-else class="attach-icon-box">
                <span class="attach-file-name">{{
                  truncateFilename(file.file_name)
                }}</span>
              </div>
              <span v-if="isImageFile(file.file_type)" class="attach-name">{{
                file.file_name
              }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 답변 작성 상태: pending / draft -->
      <template v-else>
        <div class="answer-section">
          <h2 class="answer-title">답변하기</h2>

          <!-- ④ 에디터 -->
          <ckeditor
            :editor="editorClass"
            v-model="answerContent"
            :config="editorConfig"
          />

          <!-- ⑤ 답변 첨부파일 -->
          <div class="file-upload-area">
            <p class="file-label">
              <strong>첨부파일</strong>
              <span class="file-hint"
                >jpg,jpeg,png,pdf 형식의 파일만 등록됩니다.</span
              >
            </p>
            <div class="file-grid">
              <!-- 기존 파일 -->
              <div
                v-for="file in existingFiles"
                :key="'e-' + file.id"
                class="file-card"
              >
                <button class="file-remove" @click="removeExisting(file.id)">
                  <img
                    src="/assets/icons/delete_icon.svg"
                    alt="delete"
                    width="16"
                    height="16"
                  />
                </button>
                <img
                  v-if="isImageFile(file.file_type)"
                  :src="getFileUrl(file.file_path)"
                  class="file-thumb"
                  alt="thumb"
                />
                <div v-else class="file-icon-box"></div>
                <span class="file-name">{{
                  truncateFilename(file.file_name)
                }}</span>
              </div>
              <!-- 새 파일 -->
              <div
                v-for="(item, idx) in newFiles"
                :key="'n-' + idx"
                class="file-card"
              >
                <button class="file-remove" @click="removeNew(idx)">
                  <img
                    src="/assets/icons/delete_icon.svg"
                    alt="delete"
                    width="16"
                    height="16"
                  />
                </button>
                <img
                  v-if="item.preview"
                  :src="item.preview"
                  class="file-thumb"
                  alt="preview"
                />
                <div v-else class="file-icon-box"></div>
                <span class="file-name">{{ truncateFilename(item.name) }}</span>
              </div>
              <!-- 추가하기 버튼 -->
              <div
                v-if="totalFileCount < 5"
                class="file-card add-card"
                @click="triggerFileInput"
              >
                <div class="add-icon">
                  <img src="/assets/icons/add_icon.svg" alt="add" />
                </div>
                <span>추가하기</span>
              </div>
            </div>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              style="display: none"
              @change="handleFileSelect"
            />
          </div>

          <!-- ⑥⑦⑧ 하단 버튼 -->
          <div class="action-bar">
            <span v-if="statusMsg" :class="['status-msg', statusMsgType]">{{
              statusMsg
            }}</span>
            <button class="btn-draft" @click="saveDraft">임시저장</button>
            <button class="btn-submit" @click="submitAnswer">답변완료</button>
          </div>
        </div>
      </template>
    </div>

    <!-- 이미지 뷰어 -->
    <div
      v-if="viewerVisible"
      class="image-viewer-overlay"
      @click.self="closeViewer"
    >
      <div class="viewer-header">
        <button class="viewer-btn" @click="zoomOut">
          <img src="/assets/icons/zoom_out.svg" alt="zoom-out" />
        </button>
        <span class="viewer-zoom">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="viewer-btn" @click="zoomIn">
          <img src="/assets/icons/zoom_in.svg" alt="zoom-in" />
        </button>
        <button class="viewer-btn" @click="downloadViewerFile">
          <img
            src="/assets/icons/download_icon.svg"
            alt="download"
            width="16"
            height="16"
          />
          다운로드
        </button>
        <button class="viewer-close" @click="closeViewer">&times;</button>
      </div>
      <div class="viewer-body" @click.self="closeViewer">
        <img
          :src="viewerSrc"
          :style="{ transform: `scale(${zoomLevel})` }"
          class="viewer-image"
          alt="preview"
        />
      </div>
    </div>

    <!-- 로딩 -->
    <FadeLoader v-if="isProcessing" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import { inquiryAPI } from '@/api/inquiry';
import { UseMessageStore } from '@/store/message';
import FadeLoader from '@/components/common/FadeLoader.vue';
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
  FontColor,
  FontBackgroundColor,
  FontSize,
  FontFamily,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

const ckeditor = CkeditorComponent;
const editorClass = ClassicEditor;
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
    '|',
    'undo',
    'redo',
  ],
  fontSize: { options: [9, 11, 13, 'default', 17, 19, 21, 27, 35] },
  language: 'ko',
  placeholder: '답변내용 입력하기',
};

const router = useRouter();
const route = useRoute();
const message = UseMessageStore();
const props = defineProps({ id: [String, Number] });

// ---- 데이터 ----
const isProcessing = ref(false);
const inquiry = ref(null);
const answerContent = ref('');
const existingFiles = ref([]);
const newFiles = ref([]);
const fileInput = ref(null);
const originalData = ref('');

const totalFileCount = computed(
  () => existingFiles.value.length + newFiles.value.length,
);

// 상태 메시지
const statusMsg = ref('');
const statusMsgType = ref('');
let statusTimer = null;
const showStatusMsg = (msg, type, duration = 0) => {
  statusMsg.value = msg;
  statusMsgType.value = type;
  if (statusTimer) clearTimeout(statusTimer);
  if (duration > 0) {
    statusTimer = setTimeout(() => {
      statusMsg.value = '';
    }, duration);
  }
};

// ---- 초기 로드 ----
onMounted(async () => {
  try {
    const res = await inquiryAPI.getInquiryDetail(props.id);
    inquiry.value = res.data.data;

    if (inquiry.value.status !== 'answered') {
      answerContent.value = inquiry.value.answer || '';
      existingFiles.value = inquiry.value.answer_attachments || [];
    }

    updateOriginal();
  } catch (e) {
    message.showAlert('문의를 불러올 수 없습니다.');
    router.push('/admin/inquiries');
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  newFiles.value.forEach((f) => {
    if (f.preview) URL.revokeObjectURL(f.preview);
  });
});

// ---- dirty 체크 ----
const updateOriginal = () => {
  originalData.value = JSON.stringify({
    answer: answerContent.value,
    existingIds: existingFiles.value.map((f) => f.id).sort(),
    newCount: newFiles.value.length,
  });
};
const isDirty = computed(() => {
  if (!inquiry.value || inquiry.value.status === 'answered') return false;
  return (
    JSON.stringify({
      answer: answerContent.value,
      existingIds: existingFiles.value.map((f) => f.id).sort(),
      newCount: newFiles.value.length,
    }) !== originalData.value
  );
});

// ---- 라우트 가드 ----
const handleBeforeUnload = (e) => {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};
onBeforeRouteLeave((to, from, next) => {
  if (!isDirty.value || inquiry.value?.status === 'answered') return next();
  const leave = window.confirm(
    '사이트에서 나가시겠습니까?\n변경사항이 저장되지 않을 수 있습니다.',
  );
  next(leave);
});

// ---- 파일 처리 ----
const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
const imageTypes = ['jpg', 'jpeg', 'png'];
const isImageFile = (type) => imageTypes.includes(type?.toLowerCase());

const triggerFileInput = () => fileInput.value?.click();

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files);
  const remaining = 5 - totalFileCount.value;
  if (files.length > remaining) {
    message.showAlert(
      `최대 5개까지 등록 가능합니다.\n${remaining}개만 추가할 수 있습니다.`,
    );
  }
  const toAdd = files.slice(0, remaining);
  for (const file of toAdd) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(ext)) {
      message.showAlert(`허용되지 않는 파일 형식입니다: ${file.name}`);
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.showAlert(`파일 크기가 10MB를 초과합니다: ${file.name}`);
      continue;
    }
    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null;
    newFiles.value.unshift({ file, name: file.name, type: file.type, preview });
  }
  e.target.value = '';
};

const removeExisting = (fileId) => {
  existingFiles.value = existingFiles.value.filter((f) => f.id !== fileId);
};
const removeNew = (idx) => {
  if (newFiles.value[idx].preview)
    URL.revokeObjectURL(newFiles.value[idx].preview);
  newFiles.value.splice(idx, 1);
};

// ---- 유틸 ----
const truncateFilename = (name) => {
  if (!name || name.length <= 15) return name;
  const ext = name.split('.').pop();
  const base = name.slice(0, name.length - ext.length - 1);
  return base.slice(0, 6) + '...' + ext;
};

const getFileUrl = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

const formatDateTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}:${sec}`;
};

// ---- FormData 빌드 ----
const buildFormData = (status) => {
  const fd = new FormData();
  fd.append('answer', answerContent.value);
  fd.append('status', status);
  if (existingFiles.value.length > 0) {
    fd.append(
      'keep_attachments',
      JSON.stringify(existingFiles.value.map((f) => f.id)),
    );
  }
  for (const item of newFiles.value) {
    fd.append('attachments', item.file);
  }
  return fd;
};

// ---- 임시저장 ----
const saveDraft = async () => {
  isProcessing.value = true;
  try {
    await inquiryAPI.saveAnswer(props.id, buildFormData('draft'));
    showStatusMsg('임시저장되었습니다.', 'success', 5000);

    // 데이터 다시 로드
    const res = await inquiryAPI.getInquiryDetail(props.id);
    inquiry.value = res.data.data;
    answerContent.value = inquiry.value.answer || '';
    existingFiles.value = inquiry.value.answer_attachments || [];
    newFiles.value = [];
    updateOriginal();
  } catch (e) {
    message.showAlert('임시저장에 실패했습니다.');
  } finally {
    isProcessing.value = false;
  }
};

// ---- 답변완료 ----
const submitAnswer = () => {
  if (!answerContent.value || !answerContent.value.trim()) {
    showStatusMsg('답변 내용을 입력해 주세요.', 'error');
    return;
  }

  message.showConfirm(
    '답변을 작성하시겠습니까?\n완료한 후엔 수정할 수 없습니다.',
    async () => {
      isProcessing.value = true;
      try {
        await inquiryAPI.saveAnswer(props.id, buildFormData('answered'));

        // 데이터 다시 로드 (읽기전용 모드로 전환)
        const res = await inquiryAPI.getInquiryDetail(props.id);
        inquiry.value = res.data.data;
        updateOriginal();
        message.showAlert('답변이 완료되었습니다.');
      } catch (e) {
        message.showAlert('답변 완료에 실패했습니다.');
      } finally {
        isProcessing.value = false;
      }
    },
  );
};

// ---- 뒤로가기 ----
const goBack = () => {
  router.push('/admin/inquiries');
};

// ---- 이미지 뷰어 ----
const viewerVisible = ref(false);
const viewerSrc = ref('');
const viewerFile = ref(null);
const zoomLevel = ref(1);

const previewFile = (file) => {
  const url = getFileUrl(file.file_path);
  if (isImageFile(file.file_type)) {
    viewerSrc.value = url;
    viewerFile.value = file;
    zoomLevel.value = 1;
    viewerVisible.value = true;
  } else if (file.file_type === 'pdf') {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    a.click();
  }
};

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3);
};
const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.25);
};
const closeViewer = () => {
  viewerVisible.value = false;
};
const downloadViewerFile = () => {
  if (!viewerFile.value) return;
  const a = document.createElement('a');
  a.href = viewerSrc.value;
  a.download = viewerFile.value.file_name;
  a.click();
};
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

.detail-area {
  // max-width: 900px;
}

// ① 뒤로가기
.back-row {
  margin-bottom: 16px;
}
.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: $dark-text;
  @include font-14-regular;
  cursor: pointer;
  &:hover {
    color: $white;
  }
}

// ② 문의 상세
.inquiry-section {
  margin-bottom: 24px;
}
.inquiry-title {
  @include font-24-bold;
  margin-bottom: 12px;
}
.inquiry-meta {
  @include font-14-regular;
  color: $dark-input-gray;
  margin-bottom: 20px;
  .meta-divider {
    margin: 0 8px;
  }
}
.inquiry-content {
  @include font-14-regular;
  line-height: 1.7;
  margin-bottom: 16px;
}

// ③ 첨부파일 (고객/답변 공용)
.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.attachment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}
.attach-thumb {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: $radius-sm;
  border: 1px solid $dark-line-gray;
}
.attach-icon {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-op;
  border-radius: $radius-sm;
  border: 1px dashed $dark-line-gray;
}
.attach-name {
  @include font-12-regular;
  color: $dark-text;
  margin-top: 4px;
  max-width: 100px;
  text-align: center;
  word-break: break-all;
}

.divider {
  border: none;
  border-top: 1px solid $dark-line-gray;
  margin: 24px 0;
}

// ④ 답변 섹션
.answer-section {
  margin-top: 8px;
}
.answer-title {
  @include font-20-bold;
  margin-bottom: 8px;
}
.answer-date {
  @include font-14-regular;
  color: $dark-input-gray;
  margin-bottom: 16px;
}
.answer-content {
  @include font-14-regular;
  line-height: 1.7;
  margin-bottom: 16px;
}

// CKEditor 다크 테마
:deep(.ck-editor) {
  margin-bottom: 24px;
}
:deep(.ck-editor__editable) {
  min-height: 200px;
  background: $dark-input !important;
  color: $white !important;
  border-color: $dark-line-gray !important;
}
:deep(.ck-toolbar) {
  background: $bg-op !important;
  border-color: $dark-line-gray !important;
}
:deep(.ck-toolbar__items .ck-button) {
  color: $white !important;
}
:deep(.ck-toolbar__items .ck-button:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
}
:deep(.ck-dropdown__panel) {
  background: $dark-input !important;
  border-color: $dark-line-gray !important;
}

// ⑤ 파일 업로드
.file-upload-area {
  margin-bottom: 24px;
}
.file-label {
  @include font-14-bold;
  margin-bottom: 12px;
  .file-hint {
    @include font-12-regular;
    color: $dark-text;
    margin-left: 8px;
  }
}
.file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.file-card {
  position: relative;
  width: 126px;
  height: 126px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed $dark-line-gray;
  border-radius: $radius-sm;
  cursor: pointer;
}
.file-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: $dark-text;
  color: $white;
  border: none;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.file-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}
.file-icon-box {
  width: 80px;
  height: 80px;
  background: $bg-op;
  border-radius: 4px;
}
.file-name {
  @include font-12-regular;
  color: $dark-text;
  margin-top: 4px;
  text-align: center;
  word-break: break-all;
}
.add-card {
  border: 2px dashed $white;
  color: $white;
  gap: 8px;
  @include font-12-regular;
  &:hover {
    border-color: $main-color;
    color: $main-color;
  }
  .add-icon {
    font-size: 28px;
  }
}

// 답변 첨부 (읽기전용)
.attach-icon-box {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: $bg-op;
  border: 1px dashed $dark-line-gray;
  border-radius: $radius-sm;
}
.attach-file-name {
  @include font-12-regular;
  color: $dark-text;
  max-width: 84px;
  text-align: center;
  word-break: break-all;
}

// ⑥⑦⑧ 하단 버튼
.action-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.status-msg {
  @include font-14-regular;
  &.success {
    color: $dark-text;
  }
  &.error {
    color: #e57373;
  }
}
.btn-draft {
  padding: 10px 32px;
  // border: 1px solid $dark-line-gray;
  background: $main-gad;
  color: $white;
  border-radius: $radius-sm;
  min-width: 136px;
  @include font-14-medium;
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}
.btn-submit {
  min-width: 136px;
  padding: 10px 32px;
  background: $main-gad;
  border: none;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
}

// 이미지 뷰어
.image-viewer-overlay {
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
.viewer-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  height: 70px;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.5);
}
.viewer-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: $white;
  @include font-14-regular;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
  img {
    width: 24px;
    height: 24px;
  }
}
.viewer-zoom {
  @include font-14-bold;
  color: $white;
  min-width: 50px;
  text-align: center;
}
.viewer-close {
  // position: absolute;
  // right: 24px;
  background: none;
  border: none;
  color: $white;
  font-size: 28px;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}
.viewer-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}
.viewer-image {
  max-width: 90%;
  max-height: 85vh;
  transition: transform 0.2s;
}
</style>
