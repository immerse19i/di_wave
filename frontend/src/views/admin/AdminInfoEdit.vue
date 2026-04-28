<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">정보 수정</h2>
      <div class="breadcrumb">정보수정</div>
    </div>

    <!-- 저장 버튼 + 메시지 -->
    <div class="action-row">
      <span v-if="statusMsg" :class="['status-msg', statusMsgType]">{{
        statusMsg
      }}</span>
      <button class="btn-save" @click="handleSave">저장</button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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

const form = ref({ title: '', content: '' });

// 상태 메시지
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

const stripHtml = (html) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .trim();

// 데이터 로드
const loadInfo = async () => {
  try {
    const res = await adminAPI.getInfo();
    const d = res.data.data;
    form.value.title = d.title || '';
    form.value.content = d.content || '';
  } catch (e) {
    console.error('loadInfo error:', e);
  }
};

// 저장
const handleSave = async () => {
  if (!stripHtml(form.value.content)) {
    showStatusMsg('내용을 입력해 주세요', 'error', 5000);
    return;
  }
  try {
    await adminAPI.updateInfo(form.value);
    showStatusMsg('저장되었습니다', 'success', 5000);
  } catch (e) {
    showStatusMsg('저장에 실패했습니다.', 'error', 5000);
  }
};

onMounted(() => {
  loadInfo();
});
</script>

<style lang="scss" scoped>
.page-wrap {
  padding: 32px 24px;
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

.action-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  .status-msg {
    @include font-14-regular;
    &.success {
      color: $dark-text;
    }
    &.error {
      color: #e57373;
    }
  }
  .btn-save {
    min-width: 136px;
    padding: 7.5px;
    border: none;
    border-radius: 4px;
    @include font-14-medium;
    cursor: pointer;
    color: $white;
    background: $main-gad;
    &:hover {
      background: $main-color;
    }
  }
}

.form-group {
  margin-bottom: 24px;
}
.form-label {
  display: block;
  @include font-14-bold;
  color: $white;
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
    .ck-list {
      background: $bg-op;
    }
    .ck-list .ck-list__item {
      .ck-button {
        color: $white;
        background: transparent;
        .ck-button__label {
          color: $white;
        }
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        &.ck-on {
          background: $main-color;
          color: $white;
          .ck-button__label {
            color: $white;
          }
        }
      }
    }
    .ck-input,
    .ck-input-text {
      background: $dark-input;
      color: $white;
      border-color: $dark-line-gray;
    }
    .ck-editor__editable {
      min-height: 400px;
      background: $dark-input;
      color: $white;
      border-color: $dark-line-gray;
      &.ck-focused {
        border-color: $main-color;
      }
    }
  }
}
</style>
