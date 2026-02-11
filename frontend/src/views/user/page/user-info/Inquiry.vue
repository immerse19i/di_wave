<template>
  <div class="inquiry">
    <div class="form-group">
      <label>제목</label>
      <input type="text" v-model="form.title" placeholder="제목을 입력해 주세요">
    </div>

    <div class="form-group">
      <label>문의 내용</label>
      <div class="textarea-wrap">
        <textarea v-model="form.content" placeholder="문의내용을 입력해 주세요
        
문의에 대한 내용은 ID에 사용된 메일로 회신됩니다."></textarea>
        <p class="guide-text"></p>
      </div>
    </div>

    <div class="form-group">
      <label>첨부파일</label>
      <span class="file-guide">jpg,pjeg,png,pdf 형식의 파일만 등록됩니다. 최대 10mb</span>
    </div>

<div class="file-upload">
  <!-- 첨부된 파일 미리보기 -->
  <div v-for="(file, index) in files" :key="index" class="file-item">
    <button class="delete-btn" @click="removeFile(index)">
      <img src="/assets/icons/delete_icon.svg" alt="delete" width="16" height="16">
    </button>
    <!-- 이미지 미리보기 -->
    <img v-if="isImage(file)" :src="getPreviewUrl(file)" alt="preview" class="preview-img">
    <!-- PDF는 파일명 표시 -->
    <span v-else class="pdf-name">{{ file.name }}</span>
  </div>

  <!-- 추가하기 버튼 -->
  <div class="upload-box" @click="openFilePicker">
    <span class="plus-icon">
      <img src="/assets/icons/add_icon.svg" alt="add_icon">
    </span>
    <span>추가하기</span>
  </div>
  <input type="file" ref="fileInput" @change="onFileChange" accept=".jpg,.jpeg,.png,.pdf" hidden>
</div>


    <div class="btn-wrap">
      <button class="submit-btn" @click="submitInquiry">문의하기</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const form = ref({
  title: '',
  content: '',
});

const files = ref([]);
const fileInput = ref(null);

const openFilePicker = () => {
  fileInput.value.click();
};

const onFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 10MB 제한
  if (file.size > 10 * 1024 * 1024) {
    alert('파일 크기는 최대 10MB까지 가능합니다.');
    return;
  }

  files.value.push(file);
  fileInput.value.value = ''; // 같은 파일 재선택 가능하도록
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

const submitInquiry = () => {
  if (!form.value.title.trim()) {
    alert('제목을 입력해 주세요.');
    return;
  }
  if (!form.value.content.trim()) {
    alert('문의 내용을 입력해 주세요.');
    return;
  }
  // TODO: API 연동
  console.log('문의 제출:', form.value, files.value);
  alert('문의가 등록되었습니다.');
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
      
      &::placeholder{
        color:$dark-input-gray
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
        &::placeholder{
          color: $dark-input-gray;
        }
      }

      .guide-text {
        @include font-12-regular;
        color: $dark-input-gray;
        margin-top: 4px;
      }
    }

    &:has(.file-guide){
        display:flex;
        gap:12px;
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
        color: $white
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
      background: $main-gad;
      color: $white;
      border-radius: $radius-sm;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>
