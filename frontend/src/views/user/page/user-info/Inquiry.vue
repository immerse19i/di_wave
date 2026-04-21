<template>
  <div class="inquiry">
    <div class="form-group">
      <label>제목</label>
      <input
        type="text"
        v-model="form.title"
        placeholder="제목을 입력해 주세요"
      />
    </div>

    <div class="form-group">
      <label>문의 내용</label>
      <div class="textarea-wrap">
        <textarea
          v-model="form.content"
          placeholder="문의내용을 입력해 주세요
        
문의에 대한 내용은 ID에 사용된 메일로 회신됩니다."
        ></textarea>
        <p class="guide-text"></p>
      </div>
    </div>

    <div class="form-group">
      <label>첨부파일</label>
      <span class="file-guide"
        >jpg,jpeg,png,pdf 형식의 파일만 등록됩니다. 최대 10mb</span
      >
    </div>

    <div class="file-upload">
      <!-- 첨부된 파일 미리보기 -->
      <div v-for="(file, index) in files" :key="index" class="file-item">
        <button class="delete-btn" @click="removeFile(index)">
          <img
            src="/assets/icons/delete_icon.svg"
            alt="delete"
            width="16"
            height="16"
          />
        </button>
        <!-- 이미지 미리보기 -->
        <img
          v-if="isImage(file)"
          :src="getPreviewUrl(file)"
          alt="preview"
          class="preview-img"
        />
        <!-- PDF는 파일명 표시 -->
        <span v-else class="pdf-name">{{ truncateFileName(file.name) }}</span>
      </div>

      <!-- 추가하기 버튼 -->
      <div class="upload-box" @click="openFilePicker">
        <span class="plus-icon">
          <img src="/assets/icons/add_icon.svg" alt="add_icon" />
        </span>
        <span>추가하기</span>
      </div>
      <input
        type="file"
        ref="fileInput"
        @change="onFileChange"
        accept=".jpg,.jpeg,.png,.pdf"
        hidden
      />
    </div>
    <!-- 2026.03.18 class 바인딩 추가 -->
    <div class="btn-wrap">
      <button
        class="submit-btn"
        :class="{ active: isFormValid }"
        @click="submitInquiry"
      >
        문의하기
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { inquiryAPI } from '@/api/inquiry';
import { UseMessageStore } from '@/store/message';

const message = UseMessageStore();

const form = ref({
  title: '',
  content: '',
});

const files = ref([]);
const fileInput = ref(null);
const isSubmitting = ref(false);

// 버튼 활성 조건: 제목 + 내용 모두 입력
const isFormValid = computed(() => {
  return form.value.title.trim() !== '' && form.value.content.trim() !== '';
});

const openFilePicker = () => {
  if (files.value.length >= 5) {
    message.showAlert('첨부파일은 최대 5개까지 가능합니다.');
    return;
  }
  fileInput.value.click();
};

const onFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    message.showAlert('용량이 10mb를 초과하였습니다.');
    return;
  }

  if (files.value.length >= 5) {
    message.showAlert('첨부파일은 최대 5개까지 가능합니다.');
    return;
  }

  files.value.unshift(file);
  fileInput.value.value = '';
};

const removeFile = (index) => {
  files.value.splice(index, 1);
};

const isImage = (file) => {
  return file.type.startsWith('image/');
};

const getPreviewUrl = (file) => {
  return URL.createObjectURL(file);
};

// 파일명 중간 생략
const truncateFileName = (name, maxLen = 12) => {
  if (name.length <= maxLen) return name;
  const ext =
    name.lastIndexOf('.') !== -1 ? name.slice(name.lastIndexOf('.')) : '';
  const nameOnly = name.slice(
    0,
    name.lastIndexOf('.') !== -1 ? name.lastIndexOf('.') : name.length,
  );
  const keep = maxLen - ext.length - 3;
  if (keep <= 0) return name;
  return (
    nameOnly.slice(0, Math.ceil(keep / 2)) +
    '...' +
    nameOnly.slice(-Math.floor(keep / 2)) +
    ext
  );
};

const submitInquiry = async () => {
  if (!isFormValid.value) {
    message.showAlert('제목, 문의 내용을 전부 작성하여 주세요.');
    return;
  }

  message.showConfirm(
    '문의내용은 제출 후 수정할 수 없습니다. 계속하시겠습니까?',
    async () => {
      if (isSubmitting.value) return;
      isSubmitting.value = true;

      try {
        const formData = new FormData();
        formData.append('title', form.value.title);
        formData.append('content', form.value.content);

        files.value.forEach((file) => {
          formData.append('attachments', file);
        });

        await inquiryAPI.createInquiry(formData);

        message.showAlert('작성하신 내용이 접수되었습니다.');

        form.value.title = '';
        form.value.content = '';
        files.value = [];
      } catch (error) {
        console.error('문의 등록 실패:', error);
        message.showAlert(
          '문의 등록에 실패했습니다.\n잠시 후 다시 시도해 주세요.',
        );
      } finally {
        isSubmitting.value = false;
      }
    },
  );
};
</script>

<style scoped lang="scss">
.inquiry {
  padding: 24px;
  color: $white;

  .form-group {
    margin-bottom: 16px;

    label {
      @include font-16-bold;
      display: block;
      margin-bottom: 16px;
    }

    input {
      width: 100%;
      padding: 12px;
      background: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-regular;

      &::placeholder {
        color: $dark-input-gray;
      }
      &:focus {
        border-color: $sub-color-2;
        outline: none;
      }
    }

    .textarea-wrap {
      position: relative;

      textarea {
        width: 100%;
        min-height: 229px;
        padding: 12px;

        padding-bottom: 32px;
        background: $dark-input;
        border: 1px solid $dark-line-gray;
        border-radius: $radius-sm;
        color: $white;
        resize: vertical;
        @include font-14-regular;
        &::placeholder {
          color: $dark-input-gray;
        }
        &:focus {
          border-color: $sub-color-2;
          outline: none;
        }
      }

      .guide-text {
        @include font-12-regular;
        color: $dark-input-gray;
        margin-top: 4px;
      }
    }

    &:has(.file-guide) {
      display: flex;
      gap: 12px;
    }
    .file-guide {
      @include font-12-regular;
      color: $dark-input-gray;
    }
  }

  .file-upload {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 24px;

    .upload-box {
      width: 126px;
      height: 126px;
      border: 2px dashed $white;
      // border-radius: $radius-md;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      gap: 8px;

      .plus-icon {
        font-size: 28px;
        color: $white;
      }

      span {
        @include font-12-regular;
        color: $white;
      }

      &:hover {
        border-color: $sub-color-2;
      }
    }

    .file-item {
      width: 126px;
      height: 126px;
      border: 2px dashed $white;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      .delete-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        z-index: 1;
        padding: 0;
        line-height: 0;
      }

      .preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .pdf-name {
        @include font-12-regular;
        color: $white;
        padding: 8px;
        word-break: break-all;
        text-align: center;
      }
    }
  }

  .btn-wrap {
    display: flex;
    justify-content: center;

    .submit-btn {
      @include font-14-medium;
      padding: 12px 48px;
      background: $dark-line-gray; // 기본: 비활성 색상
      color: $white;
      border-radius: $radius-sm;

      &.active {
        background: $main-gad; // 활성: 푸른색
      }

      // &:hover {
      //   opacity: 0.9;
      // }
    }
  }
}
</style>
