<template>
  <div class="page-wrap">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h2 class="page-title">승인관리</h2>
      <div class="breadcrumb">승인관리 &gt; 목록 &gt; 상세보기</div>
    </div>

    <div class="detail-content" v-if="hospital">
      <!-- ① 뒤로가기 -->
      <button class="btn-back" @click="router.push('/admin/approval')">
        &lt;&nbsp; 뒤로가기
      </button>

      <!-- ② 병원명 + 가입일 -->
      <h1 class="hospital-name">{{ hospital.name }}</h1>
      <p class="join-date">{{ formatShortDate(hospital.created_at) }} 가입</p>

      <!-- ③ 상세 정보 카드 -->
      <div class="info-card">
        <div class="info-row">
          <div class="info-field">
            <span class="field-label">ID</span>
            <span class="field-value">{{ hospital.login_id || '-' }}</span>
          </div>
          <div class="info-field">
            <span class="field-label">대표자명</span>
            <span class="field-value">{{ hospital.ceo_name || '-' }}</span>
          </div>
        </div>

        <div class="info-row">
          <div class="info-field">
            <span class="field-label">병원주소</span>
            <span class="field-value">{{ hospital.address || '-' }}</span>
          </div>
          <div class="info-field">
            <span class="field-label">연락처</span>
            <span class="field-value">{{ hospital.phone || '-' }}</span>
          </div>
        </div>

        <div class="info-row full">
          <div class="info-field">
            <span class="field-label">상세주소</span>
            <span class="field-value">{{
              hospital.address_detail || '-'
            }}</span>
          </div>
        </div>

        <div class="info-row">
          <div class="info-field">
            <span class="field-label">이메일주소</span>
            <span class="field-value">{{ hospital.email || '-' }}</span>
          </div>
          <div class="info-field">
            <span class="field-label">승인상태</span>
            <span class="field-value">{{ statusLabel(hospital.status) }}</span>
          </div>
        </div>

        <!-- ④ 사업자등록증 -->
        <div class="info-row full">
          <div class="info-field">
            <span class="field-label">사업자등록증</span>
            <span
              class="field-value file-area"
              v-if="hospital.business_license_path"
            >
              <a :href="fileUrl" download class="file-link">{{ fileName }}</a>
              <button class="btn-preview" @click="openPreview">미리보기</button>
            </span>
            <span class="field-value" v-else>-</span>
          </div>
        </div>
      </div>

      <!-- ⑤⑥ 반려/승인 버튼 (pending일 때만) -->
      <div class="action-area" v-if="hospital.status === 'pending'">
        <button class="btn-reject" @click="showRejectModal = true">반려</button>
        <button class="btn-approve" @click="showApproveModal = true">
          승인
        </button>
      </div>
    </div>

    <!-- ======== 승인 확인 모달 ======== -->
    <div
      class="modal-overlay"
      v-if="showApproveModal"
      @click.self="showApproveModal = false"
    >
      <div class="modal-box approve-modal">
        <h3 class="modal-title approve">승인</h3>
        <p class="modal-desc">
          '{{ hospital.name }}'<br />
          해당 병원을 승인하시겠습니까?
        </p>
        <div class="modal-actions">
          <button class="btn-modal-cancel" @click="showApproveModal = false">
            취소
          </button>
          <button class="btn-modal-confirm" @click="handleApprove">확인</button>
        </div>
      </div>
    </div>

    <!-- ======== 반려 처리 모달 ======== -->
    <div
      class="modal-overlay"
      v-if="showRejectModal"
      @click.self="closeRejectModal"
    >
      <div class="modal-box reject-modal">
        <h3 class="modal-title">반려처리</h3>
        <p class="modal-hospital">{{ hospital.name }}</p>
        <p class="modal-desc">
          해당 병원의 가입 신청을 반려하시겠습니까?<br />
          반려 시, 담당자에게 반려 사유가 이메일로 전송됩니다.
        </p>

        <!-- 반려 사유 라디오 -->
        <div class="reject-reasons">
          <label
            v-for="reason in rejectReasons"
            :key="reason.value"
            class="reason-item"
          >
            <input
              type="radio"
              name="rejectReason"
              :value="reason.value"
              v-model="selectedReason"
              @change="onReasonChange(reason)"
            />
            <span class="radio-custom"></span>
            <span>{{ reason.label }}</span>
          </label>
        </div>

        <!-- 사유 입력 -->
        <p class="textarea-label">사유를 작성해 주세요</p>
        <textarea
          v-model="rejectComment"
          class="reject-textarea"
          rows="4"
        ></textarea>

        <div class="modal-actions">
          <button class="btn-modal-cancel" @click="closeRejectModal">
            취소
          </button>
          <button
            class="btn-modal-confirm"
            :disabled="!selectedReason"
            @click="handleReject"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { adminAPI } from '@/api/admin';

const router = useRouter();
const route = useRoute();
const hospital = ref(null);

// 승인 모달
const showApproveModal = ref(false);

// 반려 모달
const showRejectModal = ref(false);
const selectedReason = ref('');
const rejectComment = ref('');

// 반려 사유 목록 + 자동 코멘트
const rejectReasons = [
  {
    value: '서류 식별불가',
    label: '서류 식별불가',
    comment:
      '첨부하신 서류의 화질이 낮거나 정보가 잘려 있어 확인이 어렵습니다. 글자와 직인이 선명하게 보이는 전체 사진으로 다시 첨부해 주시기 바랍니다.',
  },
  {
    value: '의료기관 개설 확인 불가',
    label: '의료기관 개설 확인 불가',
    comment:
      '입력하신 병원 정보와 첨부 서류(사업자등록증)의 정보가 일치하지 않거나, 등록된 의료기관 정보를 찾을 수 없습니다. 정확한 병원 명칭과 사업자 번호를 확인 후 재신청 부탁드립니다.',
  },
  {
    value: '가입 대상 업태/종목 미해당',
    label: '가입 대상 업태/종목 미해당',
    comment:
      '본 서비스는 보건업 등록 사업자를 대상으로 운영됩니다. 제출하신 서류상의 업태·종목이 가입 기준에 부합하지 않아 승인이 반려되었습니다. 대상 기관일 경우 서류 확인 후 재신청 부탁드립니다.',
  },
  {
    value: '기타',
    label: '기타',
    comment: '',
  },
];

// 사업자등록증 파일 URL
const fileUrl = computed(() => {
  if (!hospital.value?.business_license_path) return '';
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/${hospital.value.business_license_path}`;
});

// 파일명 추출
const fileName = computed(() => {
  if (!hospital.value?.business_license_path) return '';
  return hospital.value.business_license_path.split('/').pop();
});

// 상세 조회
const fetchDetail = async () => {
  try {
    const res = await adminAPI.getHospitalDetail(route.params.id);
    hospital.value = res.data.data;
  } catch (e) {
    console.error('상세 조회 실패:', e);
  }
};

// 라디오 선택 시 자동 코멘트
const onReasonChange = (reason) => {
  rejectComment.value = reason.comment;
};

// 반려 모달 닫기 (초기화)
const closeRejectModal = () => {
  showRejectModal.value = false;
  selectedReason.value = '';
  rejectComment.value = '';
};

// 승인 처리
const handleApprove = async () => {
  try {
    await adminAPI.approveHospital(route.params.id);
    showApproveModal.value = false;
    router.push('/admin/approval');
  } catch (e) {
    alert('승인 처리 실패');
  }
};

// 반려 처리
const handleReject = async () => {
  try {
    await adminAPI.rejectHospital(route.params.id, {
      reason: selectedReason.value,
      comment: rejectComment.value,
    });
    closeRejectModal();
    fetchDetail();
  } catch (e) {
    alert('반려 처리 실패');
  }
};

const statusLabel = (status) => {
  const map = { pending: '승인대기', approved: '승인', rejected: '반려' };
  return map[status] || status;
};

// "25.04.05" 형식
const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
};

// 미리보기 (새 탭)
const openPreview = () => {
  window.open(fileUrl.value, '_blank');
};

onMounted(() => {
  fetchDetail();
});
</script>
<style lang="scss" scoped>
.page-wrap {
  padding: 32px 42px;
  color: $white;
}

// 페이지 헤더
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

// 뒤로가기
.btn-back {
  background: none;
  border: none;
  color: $dark-text;
  @include font-14-regular;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;

  &:hover {
    color: $white;
  }
}

// 병원명
.hospital-name {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

// 가입일
.join-date {
  @include font-12-regular;
  color: $dark-text;
  margin-bottom: 32px;
}

// ── 상세 정보 카드 ──
.info-card {
  background: $bg-op;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 32px;
}

.info-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;

  &.full {
    grid-template-columns: 1fr;
  }
  &:last-child {
    margin-bottom: 0;
  }
}

.info-field {
  display: flex;
  align-items: center;
  gap: 16px;
}

.field-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  padding: 8px 16px;
  background: rgba(48, 91, 134, 0.35);
  border-radius: $radius-sm;
  @include font-14-medium;
  white-space: nowrap;
}

.field-value {
  @include font-14-regular;
  flex: 1;

  &.file-area {
    display: flex;
    align-items: center;
    gap: 16px;
  }
}

// 사업자등록증 파일
.file-link {
  color: $white;
  text-decoration: underline;
  @include font-14-regular;
  cursor: pointer;

  &:hover {
    color: $main-color;
  }
}

.btn-preview {
  padding: 6px 20px;
  background: $main-color;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;

  &:hover {
    background: $sub-color;
  }
}

// ── 승인/반려 버튼 ──
.action-area {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.btn-reject {
  min-width: 140px;
  padding: 12px 40px;
  background: #c0392b;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-bold;
  cursor: pointer;

  &:hover {
    background: #e74c3c;
  }
}

.btn-approve {
  min-width: 140px;
  padding: 12px 40px;
  background: $main-color;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-bold;
  cursor: pointer;

  &:hover {
    background: $sub-color;
  }
}

// ── 모달 공통 ──
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #1e2a3a;
  border-radius: 12px;
  padding: 40px;
  color: $white;
  text-align: center;
}

.modal-title {
  @include font-20-bold;
  margin-bottom: 8px;

  &.approve {
    color: $main-color;
  }
}

.modal-hospital {
  @include font-14-medium;
  margin-bottom: 16px;
}

.modal-desc {
  @include font-14-regular;
  color: $dark-text;
  line-height: 1.6;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}

.btn-modal-cancel {
  flex: 1;
  padding: 12px 0;
  background: rgba(255, 255, 255, 0.08);
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.btn-modal-confirm {
  flex: 1;
  padding: 12px 0;
  background: $main-color;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-bold;
  cursor: pointer;

  &:hover {
    background: $sub-color;
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: $dark-text;
    cursor: default;
  }
}

// ── 승인 모달 ──
.approve-modal {
  width: 440px;
}

// ── 반려 모달 ──
.reject-modal {
  width: 520px;
}

.reject-reasons {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
  text-align: left;
  padding: 0 40px;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 10px;
  @include font-14-regular;
  cursor: pointer;

  input[type='radio'] {
    display: none;
  }

  .radio-custom {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid $dark-text;
    position: relative;
    flex-shrink: 0;
  }

  input[type='radio']:checked + .radio-custom {
    border-color: $main-color;

    &::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: $main-color;
    }
  }
}

.textarea-label {
  @include font-14-bold;
  text-align: left;
  margin-bottom: 8px;
}

.reject-textarea {
  width: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  resize: none;
  line-height: 1.6;

  &:focus {
    border-color: $main-color;
    outline: none;
  }
}
</style>
