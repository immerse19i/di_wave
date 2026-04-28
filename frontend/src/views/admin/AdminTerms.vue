<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h2 class="page-title">이용약관</h2>
      <div class="breadcrumb">이용약관 &gt; 목록</div>
    </div>

    <!-- 테이블 -->
    <div class="content_list">
      <table>
        <colgroup>
          <col style="width: 60px" />
          <col style="width: auto" />
          <col style="width: 100px" />
          <col style="width: 200px" />
          <col style="width: 100px" />
          <col style="width: 100px" />
          <col style="width: 100px" />
        </colgroup>
        <thead>
          <tr>
            <th>No</th>
            <th>약관구분</th>
            <th>이름수정</th>
            <th>현재 등록된 파일</th>
            <th>파일변경</th>
            <th>공개/비공개</th>
            <th>이전약관</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(term, index) in termsList" :key="term.id">
            <td>{{ index + 1 }}</td>
            <td class="text-left">{{ term.name }}</td>
            <td>
              <button class="btn-action" @click="openNameModal(term)">
                이름수정
              </button>
            </td>
            <td>
              <a
                v-if="term.file_name"
                class="file-link"
                :href="getFileUrl(term.id)"
                target="_blank"
              >
                {{ term.file_name }}
              </a>
              <span v-else class="no-file">미등록</span>
            </td>
            <td>
              <label class="btn-upload">
                파일변경
                <input
                  type="file"
                  accept=".pdf"
                  hidden
                  @change="handleFileUpload(term.type, $event)"
                />
              </label>
            </td>
            <td>
              <div
                :class="['toggle-switch', { active: term.is_public }]"
                @click="handleToggle(term)"
              >
                <span class="toggle-label">{{
                  term.is_public ? '공개' : '비공개'
                }}</span>
                <span class="toggle-circle"></span>
              </div>
            </td>
            <td>
              <button class="btn-action" @click="goToHistory(term)">
                이전약관
              </button>
            </td>
          </tr>
          <tr v-if="termsList.length === 0">
            <td colspan="7" class="empty-message">등록된 약관이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 이름수정 모달 -->
    <div
      class="modal-overlay"
      v-if="showNameModal"
      @click.self="closeNameModal"
    >
      <div class="modal-box">
        <h3 class="modal-title">약관 이름 수정</h3>
        <input
          type="text"
          v-model="editName"
          class="modal-input"
          placeholder="약관 이름 입력"
          @keyup.enter="submitName"
        />
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeNameModal">취소</button>
          <button class="btn-confirm" @click="submitName">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { termsAPI } from '@/api/terms';
import { UseMessageStore } from '@/store/message';

const router = useRouter();
const message = UseMessageStore();

const termsList = ref([]);
const showNameModal = ref(false);
const editTarget = ref(null);
const editName = ref('');

// 목록 조회
const fetchTerms = async () => {
  try {
    const res = await termsAPI.getAdminTerms();
    termsList.value = res.data.data;
  } catch (e) {
    console.error('약관 목록 조회 실패:', e);
  }
};

// PDF 파일 URL
const getFileUrl = (id) => termsAPI.getFileUrl(id);

// 이름수정 모달
const openNameModal = (term) => {
  editTarget.value = term;
  editName.value = term.name;
  showNameModal.value = true;
};

const closeNameModal = () => {
  showNameModal.value = false;
  editTarget.value = null;
  editName.value = '';
};

const submitName = async () => {
  if (!editName.value.trim() || !editTarget.value) return;
  try {
    await termsAPI.updateName(editTarget.value.id, editName.value.trim());
    await fetchTerms();
    closeNameModal();
  } catch (e) {
    console.error('이름 수정 실패:', e);
  }
};

// 파일 업로드
const handleFileUpload = async (type, event) => {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    await termsAPI.uploadFile(type, formData);
    message.showAlert('업로드 완료되었습니다.');
    await fetchTerms();
  } catch (e) {
    console.error('파일 업로드 실패:', e);
    message.showAlert('업로드에 실패했습니다.');
  }
  event.target.value = ''; // input 초기화
};

// 공개/비공개 토글
const handleToggle = async (term) => {
  try {
    const res = await termsAPI.togglePublic(term.id);
    term.is_public = res.data.data.is_public;
  } catch (e) {
    console.error('토글 실패:', e);
  }
};

// 이전약관 페이지 이동
const goToHistory = (term) => {
  router.push(`/admin/terms/history/${term.type}`);
};

onMounted(() => {
  fetchTerms();
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

// 테이블
.content_list {
  padding: 12px 16px;
  background: $table-bg;
  border-radius: 12px;
  table {
    width: 100%;
    border-collapse: collapse;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
    overflow: hidden;

    th,
    td {
      text-align: center;
      padding: 12px 8px;
      @include font-12-regular;
      color: $dark-text;
    }

    thead tr {
      background: $bg-op;
    }

    th {
      @include font-14-bold;
      color: $gray;
    }

    .text-left {
      text-align: left;
      padding-left: 16px;
    }

    .empty-message {
      padding: 60px 0;
      color: $dark-text;
      @include font-14-regular;
    }
  }
}

// 파일 링크
.file-link {
  color: $dark-text;
  text-decoration: underline;
  cursor: pointer;
  @include font-12-regular;

  &:hover {
    color: $white;
  }
}

.no-file {
  color: $dark-text;
  @include font-12-regular;
}

// 버튼들
.btn-action {
  padding: 6px 14px;
  background: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-12-bold;
  cursor: pointer;
  border: none;

  &:hover {
    opacity: 0.8;
  }
}

.btn-upload {
  padding: 6px 16px;
  background: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-12-bold;
  cursor: pointer;
  display: inline-block;

  &:hover {
    background: $sub-color;
  }
}

// 토글 스위치
.toggle-switch {
  display: inline-flex;
  align-items: center;
  width: 68px;
  height: 24px;
  border-radius: 12px;
  background: #a0a0a0;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;

  .toggle-label {
    font-family: $font-family;
    font-size: 10px;
    font-weight: $font-weight-medium;
    line-height: 100%;
    color: $white;
    position: absolute;
    right: 10px;
  }

  .toggle-circle {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $white;
    position: absolute;
    left: 4px;
    transition: left 0.2s;
  }

  &.active {
    background: $main-color;

    .toggle-label {
      left: 10px;
      right: auto;
    }

    .toggle-circle {
      left: calc(100% - 20px);
    }
  }
}

// 모달
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box {
  background: $dark-bg;
  border-radius: $radius-md;
  padding: 12px;
  min-width: 564px;
  text-align: center;
  .modal-title {
    @include font-16-bold;
    color: $white;
    margin-bottom: 32px;
  }

  .modal-message {
    @include font-14-regular;
    color: $white;
    text-align: center;
    margin-bottom: 32px;
  }

  .modal-input {
    width: 100%;
    padding: 8px 8px;
    background: none;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-md;
    color: $white;
    @include font-14-regular;
    margin-bottom: 20px;

    &:focus {
      border-color: $main-color;
      outline: none;
    }
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;

    .btn-cancel {
      padding: 8px 24px;
      background: $dark-gray-dark;
      // border: 1px solid $dark-line-gray;
      color: $dark-text;
      border-radius: $radius-sm;
      @include font-14-medium;
      cursor: pointer;
      min-width: 136px;
    }

    .btn-confirm {
      padding: 8px 24px;
      background: $main-gad;
      color: $white;
      border: none;
      border-radius: $radius-sm;
      @include font-14-medium;
      cursor: pointer;
      min-width: 136px;
      min-height: 32px;
      // &:hover {
      //   background: $sub-color;
      // }
    }
  }
}
</style>
