<template>
  <div class="reapply-page">
    <div class="reapply-container">
      <!-- 뒤로가기(로그아웃) -->
      <button class="btn-back" @click="handleLogout">
        <img src="/assets/icons/arrow_back.svg" alt="back" />
        뒤로가기 (로그아웃)
      </button>

      <h1 class="page-title">회원가입 - 서류보완</h1>

      <!-- 반려 사유 영역 -->
      <div class="reject-info" v-if="rejectInfo">
        <p v-for="(line, i) in rejectInfoLines" :key="i">{{ line }}</p>
      </div>

      <div class="reapply-form" v-if="info">
        <!-- ID (readonly 텍스트) -->
        <div class="form-group readonly-group">
          <label>ID</label>
          <span class="readonly-value">{{ info.login_id }}</span>
        </div>

        <!-- 이메일 (readonly 텍스트) -->
        <div class="form-group readonly-group">
          <label>이메일</label>
          <span class="readonly-value">{{ info.email }}</span>
        </div>

        <!-- 병원명 -->
        <div class="form-group">
          <label>병원명</label>
          <input v-model="form.hospitalName" />
        </div>

        <!-- 대표자명 -->
        <div class="form-group">
          <label>대표자명</label>
          <input v-model="form.ceoName" />
        </div>

        <!-- 연락처 -->
        <div class="form-group">
          <label>연락처</label>
          <input
            v-model="form.phone"
            @input="validatePhone"
            maxlength="11"
          />
          <p class="validation-msg" v-if="phoneMessage">{{ phoneMessage }}</p>
        </div>

        <!-- 병원주소 -->
        <div class="form-group">
          <label>병원주소</label>
          <div class="input-with-btn">
            <input
              v-model="form.address"
              readonly
              @click="searchAddress"
              style="cursor: pointer"
            />
            <button type="button" @click="searchAddress">주소 검색</button>
          </div>
        </div>

        <!-- 상세주소 -->
        <div class="form-group">
          <label>상세주소</label>
          <input v-model="form.addressDetail" />
        </div>

        <!-- 사업자등록번호 -->
        <div class="form-group">
          <label>사업자등록번호</label>
          <input
            v-model="form.businessNumber"
            @input="validateBusinessNumber"
            maxlength="10"
          />
          <p class="validation-msg" v-if="bizMessage">{{ bizMessage }}</p>
        </div>

        <!-- 사업자등록증 -->
        <div class="form-group">
          <label>사업자등록증</label>
          <div class="input-with-btn">
            <input
              :value="fileName"
              readonly
              placeholder="png,jpg,jpeg,pdf, 최대10mb"
              @click="$refs.fileInput.click()"
              style="cursor: pointer"
            />
            <button type="button" @click="$refs.fileInput.click()">파일첨부</button>
            <input
              type="file"
              ref="fileInput"
              @change="handleFileChange"
              accept=".png,.jpg,.jpeg,.pdf"
              hidden
            />
          </div>
        </div>

        <!-- 하단 버튼 -->
        <button
          class="btn-submit"
          :disabled="!isDirty || isProcessing"
          @click="handleReapply"
        >
          {{ isDirty ? '재신청하기' : '보완 사항을 반영해 주세요' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { authAPI } from '@/api/auth';
import { UseMessageStore } from '@/store/message';

const router = useRouter();
const auth = useAuthStore();
const message = UseMessageStore();

const info = ref(null);
const rejectInfo = ref('');
const isProcessing = ref(false);
const selectedFile = ref(null);
const fileName = ref('');
const phoneMessage = ref('');
const bizMessage = ref('');

// 원본 데이터 (변경 감지용)
const original = ref({});

const form = ref({
  hospitalName: '',
  ceoName: '',
  phone: '',
  address: '',
  addressDetail: '',
  businessNumber: '',
});

// 반려 사유 줄바꿈 처리
const rejectInfoLines = computed(() => {
  if (!rejectInfo.value) return [];
  // admin_logs details: "승인결과 : 대기 → 반려 / 사유 : [코멘트내용]"
  const detail = rejectInfo.value;
  const lines = [];

  // 사유 파싱
  const reasonMatch = detail.match(/승인결과\s*:\s*.*→\s*반려/);
  const commentMatch = detail.match(/사유\s*:\s*\[(.+?)\]/);

  if (reasonMatch) {
    lines.push('반려 사유 : 반려');
  }
  if (commentMatch) {
    lines.push(`Comment : ${commentMatch[1]}`);
  }
  lines.push('정보변경 또는 서류재첨부 해주세요.');
  return lines;
});

// 변경 감지
const isDirty = computed(() => {
  const o = original.value;
  const f = form.value;
  return (
    f.hospitalName !== o.hospitalName ||
    f.ceoName !== o.ceoName ||
    f.phone !== o.phone ||
    f.address !== o.address ||
    f.addressDetail !== o.addressDetail ||
    f.businessNumber !== o.businessNumber ||
    selectedFile.value !== null
  );
});

// 유효성
function validatePhone() {
  const before = form.value.phone;
  form.value.phone = before.replace(/[^0-9]/g, '');
  phoneMessage.value = before !== form.value.phone ? '숫자만 입력 가능합니다' : '';
}

function validateBusinessNumber() {
  const before = form.value.businessNumber;
  form.value.businessNumber = before.replace(/[^0-9]/g, '');
  bizMessage.value = before !== form.value.businessNumber ? '숫자만 입력 가능합니다' : '';
}

function handleFileChange(e) {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      message.showAlert('용량이 초과되어 업로드 불가합니다. (최대 10mb)');
      e.target.value = '';
      return;
    }
    selectedFile.value = file;
    fileName.value = file.name;
  }
}

function searchAddress() {
  new daum.Postcode({
    oncomplete: function (data) {
      form.value.address = data.roadAddress;
    },
  }).open();
}

// 데이터 로드
async function fetchInfo() {
  try {
    const res = await authAPI.getRejectedInfo();
    info.value = res.data.data;
    rejectInfo.value = res.data.rejectInfo || '';

    const d = res.data.data;
    form.value = {
      hospitalName: d.name || '',
      ceoName: d.ceo_name || '',
      phone: d.phone || '',
      address: d.address || '',
      addressDetail: d.address_detail || '',
      businessNumber: d.business_number || '',
    };
    original.value = { ...form.value };

    // 기존 사업자등록증 파일명
    if (d.business_license_path) {
      fileName.value = d.business_license_path.split('/').pop();
    }
  } catch (e) {
    message.showAlert('정보를 불러올 수 없습니다.', () => {
      router.push('/login');
    });
  }
}

// 로그아웃
function handleLogout() {
  auth.clearUser();
  localStorage.removeItem('token');
  router.push('/login');
}

// 재신청
async function handleReapply() {
  if (!isDirty.value || isProcessing.value) return;
  isProcessing.value = true;

  const formData = new FormData();
  formData.append('hospitalName', form.value.hospitalName);
  formData.append('ceoName', form.value.ceoName);
  formData.append('phone', form.value.phone);
  formData.append('address', form.value.address);
  formData.append('addressDetail', form.value.addressDetail);
  formData.append('businessNumber', form.value.businessNumber);
  if (selectedFile.value) {
    formData.append('businessLicense', selectedFile.value);
  }

  try {
    await authAPI.reapply(formData);
    message.showAlert('재신청이 완료되었습니다.\n관리자 승인 후 사용 가능합니다.', () => {
      auth.clearUser();
      localStorage.removeItem('token');
      router.push('/login');
    });
  } catch (e) {
    message.showAlert(e.response?.data?.message || '재신청에 실패했습니다.');
  } finally {
    isProcessing.value = false;
  }
}

onMounted(() => fetchInfo());
</script>

<style lang="scss" scoped>
.reapply-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: $dark-bg;
  padding: 60px 0;
  color: $white;
}

.reapply-container {
  width: 100%;
  max-width: 556px;
  padding: 0 $spacing-lg;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  @include font-14-regular;
  cursor: pointer;
  padding: 0;
  margin-bottom: 24px;
  img { width: 12px; height: 12px; }
  &:hover { color: $white; }
}

.page-title {
  @include font-20-bold;
  text-align: center;
  margin-bottom: 24px;
}

.reject-info {
  background: rgba(255, 255, 255, 0.05);
  border-radius: $radius-md;
  padding: 16px 20px;
  margin-bottom: 32px;
  @include font-14-regular;
  color: $dark-text;
  line-height: 1.6;
}

.reapply-form {
  .form-group {
    margin-bottom: 19px;

    label {
      display: block;
      @include font-14-bold;
      color: $white;
      margin-bottom: $spacing-md;
    }

    input {
      min-height: 48px;
      width: 100%;
      padding: $spacing-md $spacing-lg;
      background-color: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-md;
      color: $white;
      @include font-14-regular;

      &::placeholder { color: $dark-input-gray; }
      &:focus { border-color: $sub-color-2; }
      &:read-only {
        background-color: darken($dark-input, 5%);
        cursor: default;
      }
    }

    &.readonly-group {
      .readonly-value {
        @include font-14-regular;
        color: $dark-input-gray;
        display: block;
      }
    }
  }

  .validation-msg {
    margin-top: 4px;
    @include font-12-regular;
    color: $red;
  }

  .input-with-btn {
    display: flex;
    gap: $spacing-md;

    input { flex: 1; }

    button {
      min-width: 136px;
      padding: $spacing-md;
      background: $main-gad;
      border: none;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-medium;
      white-space: nowrap;
      cursor: pointer;
      &:hover { background-color: $main-color; }
    }
  }
}

.btn-submit {
  width: 100%;
  padding: 14px;
  margin-top: 32px;
  background: $main-color;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;

  &:hover:not(:disabled) { background: $sub-color; }

  &:disabled {
    background: $dark-line-gray;
    color: $gray;
    cursor: not-allowed;
  }
}
</style>
