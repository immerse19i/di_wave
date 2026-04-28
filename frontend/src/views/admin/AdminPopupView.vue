<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">안내팝업</h2>
      <div class="breadcrumb">안내팝업 &gt; 목록 &gt; 조회</div>
    </div>

    <!-- 뒤로가기 + 삭제 메타 -->
    <div class="back-row">
      <button class="btn-back" @click="goBack">
        <span class="arrow">&lt;</span> 뒤로가기
      </button>
    </div>
    <div class="deleted-row">
      <div class="deleted-meta">
        <div class="deleted-dates">
          <div>{{ formatDateTime(form.created_at) }} 작성</div>
          <div>{{ formatDateTime(form.deleted_at) }} 삭제</div>
        </div>
        <div class="deleted-notice">삭제된 팝업은 조회만 가능합니다.</div>
      </div>
    </div>

    <!-- 제목 -->
    <div class="form-group">
      <label class="form-label">제목</label>
      <input :value="form.title" type="text" class="form-input" disabled />
    </div>

    <!-- 내용 (뷰어) -->
    <div class="form-group">
      <label class="form-label">내용</label>
      <div class="content-viewer" v-html="form.content"></div>
    </div>

    <!-- 팝업크기 -->
    <div class="form-row">
      <label class="form-label row-label">팝업크기</label>
      <div class="size-inputs">
        <span class="size-label">가로</span>
        <input
          :value="form.popup_width"
          type="number"
          class="size-input"
          disabled
        />
        <span class="size-unit">px</span>
        <span class="size-label">세로</span>
        <input
          :value="form.popup_height"
          type="number"
          class="size-input"
          disabled
        />
        <span class="size-unit">px</span>
      </div>
    </div>

    <!-- 게시기간 -->
    <div class="form-row">
      <label class="form-label row-label">게시기간</label>
      <div class="period-text">
        {{
          form.is_always
            ? '상시'
            : `${formatDate(form.display_start)} ~ ${formatDate(form.display_end)}`
        }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';

const router = useRouter();
const message = UseMessageStore();
const props = defineProps({ id: [String, Number] });

const form = ref({
  title: '',
  content: '',
  popup_width: 500,
  popup_height: 400,
  is_always: true,
  display_start: null,
  display_end: null,
  created_at: null,
  deleted_at: null,
});

// 날짜 포맷
const formatDateTime = (dt) => {
  if (!dt) return '-';
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${mi}:${s}`;
};
const formatDate = (dt) => {
  if (!dt) return '-';
  return String(dt).slice(0, 10);
};

// 데이터 로드
const loadPopup = async () => {
  try {
    const res = await adminAPI.getPopupDetail(props.id);
    const d = res.data.data;
    form.value.title = d.title || '';
    form.value.content = d.content || '';
    form.value.popup_width = d.popup_width || 500;
    form.value.popup_height = d.popup_height || 400;
    form.value.is_always = !!d.is_always;
    form.value.display_start = d.display_start || null;
    form.value.display_end = d.display_end || null;
    form.value.created_at = d.created_at || null;
    form.value.deleted_at = d.deleted_at || null;
  } catch (e) {
    message.showAlert('데이터를 불러올 수 없습니다.');
    router.push('/admin/popups');
  }
};

const goBack = () => {
  router.push('/admin/popups');
};

onMounted(() => {
  if (props.id) loadPopup();
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

.back-row {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
.deleted-row {
  .deleted-meta {
    text-align: right;
    color: $dark-input-gray;
    .deleted-dates {
      @include font-12-regular;
      // color: $dark-text;
      line-height: 1.5;
    }
    .deleted-notice {
      margin-top: 4px;
      @include font-12-regular;
      // color: $dark-text;
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
  // border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  box-sizing: border-box;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// 뷰어
.content-viewer {
  min-height: 300px;
  padding: 16px;
  background: $dark-input;
  // border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  line-height: 1.6;
  word-break: break-word;
  overflow-y: auto;
  :deep(img) {
    max-width: 100% !important;
    height: auto !important;
  }
  :deep(figure.image) {
    max-width: 100% !important;
    margin: 8px 0;
    img {
      max-width: 100% !important;
      height: auto !important;
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
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
}

// 게시기간 텍스트
.period-text {
  @include font-14-regular;
  color: $white;
}
</style>
