<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">공지사항</h2>
      <div class="breadcrumb">
        공지사항 &gt; 목록 &gt; {{ isDeleted ? '상세조회' : '작성' }}
      </div>
    </div>

    <!-- 뒤로가기 -->
    <button class="btn-back" @click="goBack">
      <span class="arrow">&lt;</span> 뒤로가기
    </button>

    <!-- ===== 삭제된 게시글 조회 모드 ===== -->
    <template v-if="isDeleted">
      <div class="deleted-info">
        <div class="date-info">
          {{ formatDateTime(notice.created_at) }} 작성
          <br />
          {{ formatDateTime(notice.deleted_at) }} 삭제
        </div>
        <p class="deleted-notice">삭제된 게시글은 조회만 가능합니다.</p>
      </div>

      <!-- 제목 (읽기 전용) -->
      <div class="view-title">{{ notice.title }}</div>

      <!-- 본문 (읽기 전용) -->
      <div class="view-content" v-html="notice.content"></div>

      <!-- 첨부파일 (읽기 전용) -->
      <div
        class="attachments-view"
        v-if="notice.attachments && notice.attachments.length > 0"
      >
        <h4 class="attach-label">첨부파일</h4>
        <div class="attach-list">
          <div
            v-for="file in notice.attachments"
            :key="file.id"
            class="attach-item readonly"
            @click="previewOrDownload(file)"
          >
            <img
              v-if="isImageFile(file.file_type)"
              :src="getFileUrl(file.file_path)"
              class="attach-thumb"
            />
            <span v-else class="attach-filename">{{
              truncateFilename(file.file_name)
            }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 작성/수정 모드 ===== -->
    <template v-else>
      <!-- 상태 메시지 + 버튼 -->
      <div class="action-bar">
        <span v-if="statusMsg" :class="['status-msg', statusMsgType]">{{
          statusMsg
        }}</span>
        <div class="action-buttons">
          <button class="btn-draft" @click="saveDraft">임시저장</button>
          <button class="btn-publish" @click="publish">게시하기</button>
        </div>
      </div>

      <!-- 제목 -->
      <div class="form-row">
        <label class="form-label">제목</label>
        <input
          v-model="form.title"
          type="text"
          class="form-input title-input"
          placeholder=""
        />
      </div>

      <!-- 상단고정 -->
      <div class="form-row">
        <label class="form-label">상단고정</label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.is_pinned" />
          <span class="checkbox-custom">✓</span>
        </label>
      </div>

      <!-- 공개설정 -->
      <div class="form-row">
        <label class="form-label">공개설정</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="form.visibility" value="public" />
            <span class="radio-custom"></span>
            공개
          </label>
          <label class="radio-label">
            <input type="radio" v-model="form.visibility" value="private" />
            <span class="radio-custom"></span>
            비공개
          </label>
        </div>
      </div>

      <!-- 텍스트 에디터 -->
      <div class="editor-wrap">
        <ckeditor
          v-model="form.content"
          :editor="editor"
          :config="editorConfig"
        />
      </div>

      <!-- 첨부파일 -->
      <div class="attachment-area">
        <div class="attach-header">
          <h4 class="attach-label">첨부파일</h4>
          <span class="attach-desc">
            문서(pdf, xlsx, docx, pptx, hwp), 이미지(jpg, png, gif), 영상(mp4,
            mov), 압축(zip) 파일 등록이 가능합니다. 파일당 최대 30MB, 최대
            5개까지 등록할 수 있습니다.
          </span>
        </div>
        <div class="attach-list">
          <!-- 기존 파일 (수정모드) -->
          <div
            v-for="file in existingFiles"
            :key="'existing-' + file.id"
            class="attach-item"
            @click="previewOrDownload(file)"
          >
            <button class="btn-remove" @click.stop="removeExisting(file.id)">
              ✕
            </button>
            <img
              v-if="isImageFile(file.file_type)"
              :src="getFileUrl(file.file_path)"
              class="attach-thumb"
            />
            <span v-else class="attach-filename">{{
              truncateFilename(file.file_name)
            }}</span>
          </div>
          <!-- 새 파일 -->
          <div
            v-for="(file, idx) in newFiles"
            :key="'new-' + idx"
            class="attach-item"
          >
            <button class="btn-remove" @click.stop="removeNew(idx)">✕</button>
            <img
              v-if="isImageType(file.type)"
              :src="file.preview"
              class="attach-thumb"
            />
            <span v-else class="attach-filename">{{
              truncateFilename(file.name)
            }}</span>
          </div>
          <!-- 추가하기 버튼 -->
          <div
            v-if="totalFileCount < 5"
            class="attach-item add-btn"
            @click="triggerFileInput"
          >
            <span class="plus-icon">+</span>
            <span>추가하기</span>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          multiple
          :accept="allowedExtensions"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';
import { Ckeditor as CkeditorComponent } from '@ckeditor/ckeditor5-vue';
// CKEditor
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
// CKEditor 에디터 설정
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
  fontSize: {
    options: [9, 11, 13, 'default', 17, 19, 21, 27, 35],
  },
  language: 'ko',
};

const router = useRouter();
const route = useRoute();
const message = UseMessageStore();

// props
const props = defineProps({ id: [String, Number] });
const isEditMode = computed(() => !!props.id);
const isDeleted = ref(false);

// 폼 데이터
const form = ref({
  title: '',
  content: '',
  is_pinned: false,
  visibility: 'public', // public / private
});

// 원본 데이터 (변경 감지용)
const notice = ref({});
const originalData = ref('');

// 첨부파일
const existingFiles = ref([]); // 수정모드: 기존 서버 파일
const newFiles = ref([]); // 새로 추가한 파일
const fileInput = ref(null);

const totalFileCount = computed(
  () => existingFiles.value.length + newFiles.value.length,
);

// 허용 확장자
const allowedExtList = [
  'pdf',
  'xlsx',
  'xls',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'hwp',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'mp4',
  'mov',
  'zip',
];
const allowedExtensions = allowedExtList.map((e) => `.${e}`).join(',');
const imageTypes = ['jpg', 'jpeg', 'png', 'gif'];
const isImageFile = (type) => imageTypes.includes(type?.toLowerCase());
const isImageType = (mimeType) => mimeType?.startsWith('image/');

// 상태 메시지
const statusMsg = ref('');
const statusMsgType = ref(''); // 'error' or 'success'
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

// dirty 체크
const isDirty = computed(() => {
  const current = JSON.stringify({
    title: form.value.title,
    content: form.value.content,
    is_pinned: form.value.is_pinned,
    visibility: form.value.visibility,
    existingIds: existingFiles.value.map((f) => f.id).sort(),
    newCount: newFiles.value.length,
  });
  return current !== originalData.value;
});

// ---- 초기 로드 ----
onMounted(async () => {
  if (isEditMode.value) {
    try {
      const res = await adminAPI.getNoticeDetail(props.id);
      const data = res.data.data;
      notice.value = data;

      if (data.status === 'deleted') {
        isDeleted.value = true;
        return;
      }

      form.value.title = data.title || '';
      form.value.content = data.content || '';
      form.value.is_pinned = !!data.is_pinned;
      form.value.visibility = data.status === 'private' ? 'private' : 'public';
      existingFiles.value = data.attachments || [];

      // 원본 스냅샷
      updateOriginal();
    } catch (e) {
      message.showAlert('공지사항을 불러올 수 없습니다.');
      router.push('/admin/notices');
    }
  } else {
    updateOriginal();
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

const updateOriginal = () => {
  originalData.value = JSON.stringify({
    title: form.value.title,
    content: form.value.content,
    is_pinned: form.value.is_pinned,
    visibility: form.value.visibility,
    existingIds: existingFiles.value.map((f) => f.id).sort(),
    newCount: newFiles.value.length,
  });
};

// ---- 라우트 가드 ----
const handleBeforeUnload = (e) => {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};
onBeforeRouteLeave((to, from, next) => {
  if (!isDirty.value || isDeleted.value) return next();
  const leave = window.confirm(
    '사이트에서 나가시겠습니까?\n변경사항이 저장되지 않을 수 있습니다.',
  );
  next(leave);
});

// ---- 파일 처리 ----
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
    // 확장자 체크
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtList.includes(ext)) {
      message.showAlert(`허용되지 않는 파일 형식입니다: ${file.name}`);
      continue;
    }
    // 용량 체크 (30MB)
    if (file.size > 30 * 1024 * 1024) {
      message.showAlert(`파일 크기가 30MB를 초과합니다: ${file.name}`);
      continue;
    }
    // 미리보기 URL 생성
    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null;
    newFiles.value.unshift({ file, name: file.name, type: file.type, preview });
  }

  // input 초기화 (같은 파일 재선택 가능)
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
  if (!name) return '';
  if (name.length <= 15) return name;
  const ext = name.split('.').pop();
  const base = name.slice(0, name.length - ext.length - 1);
  return base.slice(0, 6) + '...' + ext;
};

const getFileUrl = (path) => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  return `${apiUrl}/${path}`;
};

const previewOrDownload = (file) => {
  const url = getFileUrl(file.file_path);
  if (isImageFile(file.file_type)) {
    // 이미지 미리보기 (새 탭으로 간이 처리, 추후 뷰어 연동)
    window.open(url, '_blank');
  } else if (file.file_type === 'pdf') {
    window.open(url, '_blank');
  } else {
    // 다운로드
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    a.click();
  }
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

// ---- 저장 ----
const validate = () => {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    showStatusMsg('제목, 내용을 모두 입력해 주세요', 'error');
    return false;
  }
  return true;
};

const buildFormData = (status) => {
  const fd = new FormData();
  fd.append('title', form.value.title);
  fd.append('content', form.value.content);
  fd.append('status', status);
  fd.append('is_pinned', form.value.is_pinned);

  // 유지할 기존 파일 ID
  if (existingFiles.value.length > 0) {
    fd.append(
      'keep_attachments',
      JSON.stringify(existingFiles.value.map((f) => f.id)),
    );
  }

  // 새 파일
  for (const item of newFiles.value) {
    fd.append('attachments', item.file);
  }

  return fd;
};

const saveDraft = async () => {
  // 임시저장은 빈 제목/내용 허용
  const fd = buildFormData('draft');
  try {
    if (isEditMode.value) {
      await adminAPI.updateNotice(props.id, fd);
    } else {
      const res = await adminAPI.createNotice(fd);
      // 생성 후 수정모드로 전환 (URL 변경)
      router.replace(`/admin/notices/${res.data.data.id}`);
    }
    showStatusMsg('임시저장되었습니다.', 'success', 5000);
    updateOriginal();
  } catch (e) {
    message.showAlert('임시저장에 실패했습니다.');
  }
};

const publish = async () => {
  if (!validate()) return;

  const status = form.value.visibility === 'private' ? 'private' : 'published';
  const fd = buildFormData(status);
  try {
    if (isEditMode.value) {
      await adminAPI.updateNotice(props.id, fd);
    } else {
      await adminAPI.createNotice(fd);
    }
    updateOriginal(); // dirty 해제
    message.showAlert('게시되었습니다.', () => {
      router.push('/admin/notices');
    });
  } catch (e) {
    message.showAlert('게시에 실패했습니다.');
  }
};

// ---- 뒤로가기 ----
const goBack = () => {
  router.push('/admin/notices');
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

.btn-back {
  background: none;
  border: none;
  color: $dark-text;
  @include font-14-regular;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 16px;
  .arrow {
    margin-right: 4px;
  }
  &:hover {
    color: $white;
  }
}

// 삭제 게시글 조회
.deleted-info {
  text-align: right;
  margin-bottom: 16px;
  .date-info {
    @include font-12-regular;
    color: $dark-text;
    line-height: 1.6;
  }
  .deleted-notice {
    color: #e57373;
    @include font-12-regular;
    margin-top: 4px;
  }
}
.view-title {
  background: $bg-op;
  padding: 12px 16px;
  border-radius: $radius-sm;
  margin-bottom: 12px;
  @include font-14-medium;
  color: $white;
}
.view-content {
  background: $dark-input;
  padding: 20px;
  border-radius: $radius-sm;
  min-height: 200px;
  color: $dark-text;
  line-height: 1.6;
}

// 작성/수정 모드
.action-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.status-msg {
  @include font-12-regular;
  &.error {
    color: #e57373;
  }
  &.success {
    color: $dark-text;
  }
}
.btn-draft,
.btn-publish {
  padding: 8px 28px;
  border: none;
  border-radius: $radius-sm;
  cursor: pointer;
  @include font-14-medium;
}
.btn-draft {
  background: $dark-line-gray;
  color: $white;
  &:hover {
    opacity: 0.85;
  }
}
.btn-publish {
  background: $main-color;
  color: $white;
  &:hover {
    background: $sub-color;
  }
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  gap: 16px;
}
.form-label {
  min-width: 70px;
  @include font-14-bold;
  color: $white;
}
.title-input {
  flex: 1;
  padding: 10px 12px;
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  &:focus {
    border-color: $main-color;
    outline: none;
  }
}

// 체크박스
.checkbox-label {
  position: relative;
  cursor: pointer;
  input {
    display: none;
  }
  .checkbox-custom {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 2px solid $dark-line-gray;
    border-radius: $radius-sm;
    color: transparent;
    @include font-14-regular;
  }
  input:checked + .checkbox-custom {
    background: $main-color;
    border-color: $main-color;
    color: $white;
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
  cursor: pointer;
  @include font-14-regular;

  input[type='radio'] {
    display: none;
  }

  .radio-custom {
    width: 16px;
    height: 16px;
    background: $dark-line-gray;
    border: none;
    border-radius: 50%;
    position: relative;

    &::after {
      content: '';
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  input[type='radio']:checked + .radio-custom {
    background: $main-color;

    &::after {
      background: $white;
    }
  }
}

// 에디터
// 에디터
.editor-wrap {
  margin-bottom: 24px;

  :deep(.ck.ck-editor) {
    // 툴바
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
    // 드롭다운
    .ck-dropdown__panel {
      background: $bg-op;
      border-color: $dark-line-gray;
    }

    // 본문 편집 영역
    .ck-editor__editable {
      min-height: 250px;
      background: $dark-input;
      color: $white;
      border-color: $dark-line-gray;

      &.ck-focused {
        border-color: $main-color;
      }
    }
  }
}

// 첨부파일 영역
.attachment-area {
  margin-top: 24px;
}
.attach-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
.attach-label {
  @include font-14-bold;
  color: $white;
}
.attach-desc {
  @include font-12-regular;
  color: $dark-text;
}
.attach-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.attach-item {
  position: relative;
  width: 130px;
  height: 120px;
  border: 1px dashed $dark-line-gray;
  border-radius: $radius-sm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;

  &.readonly {
    cursor: pointer;
  }
  &.add-btn {
    color: $dark-text;
    @include font-12-regular;
    &:hover {
      border-color: $main-color;
      color: $main-color;
    }
  }
}
.attach-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.attach-filename {
  @include font-12-regular;
  color: $dark-text;
  text-align: center;
  padding: 8px;
  word-break: break-all;
}
.plus-icon {
  font-size: 28px;
  margin-bottom: 4px;
}
.btn-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: $white;
  border: none;
  font-size: 12px;
  cursor: pointer;
  z-index: 2;
  &:hover {
    background: #e57373;
  }
}

// 삭제 조회모드 첨부파일
.attachments-view {
  margin-top: 24px;
}
</style>
