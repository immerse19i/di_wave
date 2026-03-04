<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">가입계정목록</h2>
      <div class="breadcrumb">가입계정목록 &gt; 목록</div>
    </div>

    <div class="detail-content" v-if="account">
      <!-- 뒤로가기 -->
      <button class="btn-back" @click="handleBack">&lt;&nbsp; 뒤로가기</button>

      <h1 class="hospital-name">{{ account.name }}</h1>
      <p class="join-date">{{ formatShortDate(account.created_at) }} 가입</p>

      <!-- 기본 정보 -->
      <div class="section-title">기본 정보</div>
      <div class="info-form">
        <div class="form-row">
          <div class="form-field">
            <span class="field-label">병원명</span>
            <input v-model="form.name" />
          </div>
          <div class="form-field">
            <span class="field-label">대표자명</span>
            <input v-model="form.ceo_name" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <span class="field-label">ID</span>
            <input :value="account.login_id" disabled class="disabled" />
          </div>
          <div class="form-field">
            <span class="field-label">연락처</span>
            <input v-model="form.phone" @input="onlyNumber($event, 'phone')" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <span class="field-label">병원주소</span>
            <div class="address-wrap">
              <input
                :value="form.address"
                readonly
                class="address-input"
                @click="openAddress"
              />
              <button class="btn-address" @click="openAddress">검색</button>
            </div>
          </div>
          <div class="form-field">
            <span class="field-label">이메일주소</span>
            <input v-model="form.email" />
          </div>
        </div>
        <div class="form-row full">
          <div class="form-field">
            <span class="field-label">상세주소</span>
            <input v-model="form.address_detail" />
          </div>
        </div>
        <div class="form-row full">
          <div class="form-field">
            <span class="field-label">사업자번호</span>
            <input
              v-model="form.business_number"
              @input="onlyNumber($event, 'business_number')"
            />
          </div>
        </div>
      </div>

      <!-- 저장 버튼 -->
      <div class="save-area">
        <span class="save-msg" v-if="showSaveMsg">저장되었습니다.</span>
        <button class="btn-save" @click="handleSave">저장</button>
      </div>

      <!-- 계정정보 및 관리 -->
      <div class="section-title">계정정보 및 관리</div>
      <div class="management-area">
        <!-- 사업자등록증 -->
        <div class="mgmt-row">
          <span class="mgmt-label">사업자등록증</span>
          <div class="mgmt-value">
            <a
              v-if="account.business_license_path"
              class="file-link"
              :href="fileUrl"
              target="_blank"
            >
              {{ licenseName }}
            </a>
            <span v-else>-</span>
            <button
              class="btn-outline"
              @click="previewLicense"
              v-if="account.business_license_path"
            >
              미리보기
            </button>
            <button class="btn-outline" @click="$refs.licenseInput.click()">
              변경
            </button>
            <input
              type="file"
              ref="licenseInput"
              accept=".pdf"
              hidden
              @change="handleLicenseUpload"
            />
          </div>
        </div>

        <!-- 계정상태 -->
        <div class="mgmt-row">
          <span class="mgmt-label">계정상태</span>
          <div class="mgmt-value">
            <span>{{ accountStatusLabel }}</span>
            <button class="btn-outline" @click="openStatusChange">
              계정상태변경
            </button>
            <button
              :class="['btn-outline', { active: isLocked }]"
              :disabled="!isLocked"
              @click="handleUnlock"
            >
              로그인 제한 해제
            </button>
          </div>
        </div>

        <!-- 크레딧 -->
        <div class="mgmt-row">
          <span class="mgmt-label">크레딧</span>
          <div class="mgmt-value">
            <span>{{ account.credit_balance }}</span>
            <button class="btn-outline" @click="goToCreditHistory">
              크레딧 조회
            </button>
            <button class="btn-primary" @click="openCreditManage">관리</button>
          </div>
        </div>

        <!-- 계정기록 -->
        <div class="mgmt-row">
          <span class="mgmt-label">계정기록</span>
          <div class="mgmt-value">
            <button class="btn-primary" @click="goToAccountLog">
              기록보기
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';

const props = defineProps({ id: [String, Number] });
const router = useRouter();
const message = UseMessageStore();

const account = ref(null);
const form = ref({
  name: '',
  ceo_name: '',
  phone: '',
  email: '',
  address: '',
  address_detail: '',
  business_number: '',
});
const originalForm = ref({});
const showSaveMsg = ref(false);

// 변경 감지
const hasChanges = computed(
  () => JSON.stringify(form.value) !== JSON.stringify(originalForm.value),
);

// 계정 상태 라벨
const accountStatusLabel = computed(() => {
  if (!account.value) return '';
  if (!account.value.is_active) return '탈퇴';
  return '정상';
});

// 잠금 상태
const isLocked = computed(() => {
  if (!account.value?.locked_until) return false;
  return new Date(account.value.locked_until) > new Date();
});

// 사업자등록증 파일명
const licenseName = computed(() => {
  if (!account.value?.business_license_path) return '';
  return account.value.business_license_path.split('/').pop();
});

const fileUrl = computed(() => {
  if (!account.value?.business_license_path) return '';
  return `${import.meta.env.VITE_API_URL || ''}${account.value.business_license_path}`;
});

// 데이터 로드
const fetchDetail = async () => {
  try {
    const res = await adminAPI.getAccountDetail(props.id);
    account.value = res.data.data;
    const d = res.data.data;
    form.value = {
      name: d.name || '',
      ceo_name: d.ceo_name || '',
      phone: d.phone || '',
      email: d.email || '',
      address: d.address || '',
      address_detail: d.address_detail || '',
      business_number: d.business_number || '',
    };
    originalForm.value = { ...form.value };
  } catch (e) {
    console.error('상세 조회 실패:', e);
  }
};

// 숫자만 입력
const onlyNumber = (e, field) => {
  form.value[field] = e.target.value.replace(/[^0-9]/g, '');
};

// 주소 검색
const openAddress = () => {
  new daum.Postcode({
    oncomplete: (data) => {
      form.value.address = data.roadAddress;
    },
  }).open();
};

// 기본 정보 저장
const handleSave = async () => {
  try {
    await adminAPI.updateAccountInfo(props.id, form.value);
    originalForm.value = { ...form.value };
    showSaveMsg.value = true;
    setTimeout(() => {
      showSaveMsg.value = false;
    }, 3000);
  } catch (e) {
    message.showAlert('저장에 실패했습니다.');
  }
};

// 뒤로가기 (변경 감지)
const handleBack = () => {
  if (hasChanges.value) {
    message.showConfirm(
      '저장하지 않은 변경사항이 있습니다.\n이동하시겠습니까?',
      () => {
        router.push('/admin/accounts');
      },
    );
  } else {
    router.push('/admin/accounts');
  }
};

// 라우터 이탈 방지
onBeforeRouteLeave((to, from, next) => {
  if (hasChanges.value) {
    message.showConfirm(
      '저장하지 않은 변경사항이 있습니다.\n이동하시겠습니까?',
      () => next(),
      () => next(false),
    );
  } else {
    next();
  }
});

// beforeunload 이탈 방지
const beforeUnload = (e) => {
  if (hasChanges.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};
onMounted(() => {
  fetchDetail();
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));

// 사업자등록증 업로드 (즉시)
const handleLicenseUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await adminAPI.uploadBusinessLicense(props.id, formData);
    account.value.business_license_path = res.data.data.path;
    message.showAlert('사업자등록증이 변경되었습니다.');
  } catch (err) {
    message.showAlert('업로드에 실패했습니다.');
  }
  e.target.value = '';
};

// 미리보기
const previewLicense = () => {
  window.open(fileUrl.value, '_blank');
};

// 로그인 제한 해제
const handleUnlock = async () => {
  message.showConfirm('로그인 제한을 해제하시겠습니까?', async () => {
    try {
      await adminAPI.unlockAccount(props.id);
      account.value.locked_until = null;
      account.value.login_attempts = 0;
      message.showAlert('로그인 제한이 해제되었습니다.');
    } catch (e) {
      message.showAlert('해제에 실패했습니다.');
    }
  });
};

// TODO: 계정상태변경 팝업
const openStatusChange = () => {};

// TODO: 크레딧 조회 이동
const goToCreditHistory = () => {};

// TODO: 크레딧 관리 팝업
const openCreditManage = () => {};

// TODO: 계정기록 이동
const goToAccountLog = () => {};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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
  color: $dark-text;
  @include font-14-regular;
  cursor: pointer;
  margin-bottom: 16px;
  &:hover {
    color: $white;
  }
}

.hospital-name {
  @include font-20-bold;
  margin-bottom: 4px;
}

.join-date {
  @include font-12-regular;
  color: $dark-text;
  margin-bottom: 32px;
}

.section-title {
  @include font-16-bold;
  margin-bottom: 16px;
  margin-top: 32px;
}

// 기본 정보 폼
.info-form {
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;

    &.full {
      grid-template-columns: 1fr;
    }
  }

  .form-field {
    display: flex;
    align-items: center;
    gap: 0;

    .field-label {
      min-width: 120px;
      padding: 12px 16px;
      background: $main-gad;
      @include font-14-medium;
      border-radius: $radius-sm 0 0 $radius-sm;
      white-space: nowrap;
    }

    input {
      flex: 1;
      padding: 12px 16px;
      background: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: 0 $radius-sm $radius-sm 0;
      color: $white;
      @include font-14-regular;

      &:focus {
        border-color: $main-color;
      }

      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .address-wrap {
    flex: 1;
    display: flex;

    .address-input {
      flex: 1;
      border-radius: 0;
      cursor: pointer;
    }

    .btn-address {
      padding: 12px 20px;
      background: $main-gad;
      color: $white;
      @include font-14-medium;
      border-radius: 0 $radius-sm $radius-sm 0;
      cursor: pointer;
      white-space: nowrap;
    }
  }
}

// 저장 영역
.save-area {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-top: 16px;

  .save-msg {
    @include font-12-regular;
    color: $dark-text;
  }

  .btn-save {
    padding: 10px 32px;
    background: $main-gad;
    color: $white;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
    &:hover {
      opacity: 0.9;
    }
  }
}

// 계정정보 및 관리
.management-area {
  .mgmt-row {
    display: flex;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .mgmt-label {
      min-width: 120px;
      padding: 10px 16px;
      background: $main-gad;
      @include font-14-medium;
      border-radius: $radius-sm;
      margin-right: 16px;
      white-space: nowrap;
    }

    .mgmt-value {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;

      .file-link {
        color: $white;
        text-decoration: underline;
        @include font-14-regular;
        cursor: pointer;
      }
    }
  }
}

.btn-outline {
  padding: 8px 16px;
  background: none;
  border: 1px solid $dark-line-gray;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: $main-color;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &.active {
    border-color: $main-color;
    background: $main-color;
  }
}

.btn-primary {
  padding: 8px 16px;
  background: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;
  &:hover {
    background: $sub-color;
  }
}
</style>
