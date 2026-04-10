<template>
  <div class="profile">
    <div class="basic_info info">
      <div class="info-tit">기본 정보</div>
      <div class="row_box">
        <div class="form-group">
          <label for="hosName">병원명</label>
          <input id="hosName" type="text" v-model="form.hospital_name" />
        </div>
        <div class="form-group">
          <label for="CEOName">대표자명</label>
          <input id="CEOName" type="text" v-model="form.ceo_name" />
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="identity">ID</label>
          <input id="identity" type="text" v-model="form.login_id" disabled />
        </div>
        <div class="form-group">
          <label for="phone">연락처</label>
          <input
            id="phone"
            type="text"
            v-model="form.phone"
            @input="onlyNumber($event, 'phone')"
          />
        </div>
      </div>
      <div class="row_box">
        <div class="form-group address-group">
          <label for="hosAdress">병원주소</label>
          <input
            id="hosAdress"
            type="text"
            v-model="form.address"
            disabled
            @click="openAddress"
          />
          <button type="button" class="search-btn" @click="openAddress">
            검색
          </button>
        </div>
        <div class="form-group">
          <label for="email">이메일주소</label>
          <input id="email" type="text" v-model="form.email" />
        </div>
      </div>

      <div class="row_box">
        <div class="form-group">
          <label for="ad_detail">상세주소</label>
          <input id="ad_detail" type="text" v-model="form.address_detail" />
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="bis_number">사업자번호</label>
          <input
            id="bis_number"
            type="text"
            v-model="form.business_number"
            @input="onlyNumber($event, 'business_number')"
          />
        </div>
      </div>
      <div class="save-area">
        <span class="error-msg" v-if="errorMessage">{{ errorMessage }}</span>
        <span class="success-msg" v-if="successMessage">{{
          successMessage
        }}</span>
        <button type="button" class="save-btn" @click="handleSave">저장</button>
      </div>
    </div>
    <div class="account_info">
      <div class="info-tit">계정정보 및 관리</div>
      <div class="row_box">
        <label>사업자등록증</label>
        <a
          v-if="form.business_license_path"
          class="file-name"
          :href="'/' + form.business_license_path"
          download
        >
          {{ extractFileName(form.business_license_path) }}
        </a>
        <span v-else class="file-none">등록된 파일이 없습니다.</span>
        <button
          type="button"
          class="preview"
          @click="previewLicense"
          v-if="form.business_license_path"
        >
          미리보기
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { authAPI } from '@/api/auth';
import { onBeforeRouteLeave } from 'vue-router';
import { UseMessageStore } from '@/store/message';

const message = UseMessageStore();
const errorMessage = ref('');
const successMessage = ref('');

const handleSave = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  // 1. 빈 칸 체크 (ID, business_license_path 제외)
  const requiredFields = [
    'hospital_name',
    'ceo_name',
    'phone',
    'address',
    'address_detail',
    'email',
    'business_number',
  ];
  const hasEmpty = requiredFields.some((key) => !form.value[key]?.trim());
  if (hasEmpty) {
    message.showAlert('모든 항목을 입력해 주세요');
    return;
  }

  // 2. 숫자 검사 (연락처, 사업자번호)
  const numberOnly = /^[0-9]+$/;
  if (
    !numberOnly.test(form.value.phone) ||
    !numberOnly.test(form.value.business_number)
  ) {
    errorMessage.value = '숫자만 입력 가능합니다';
    return;
  }

  // 3. 이메일 유효성 검사
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.value.email)) {
    errorMessage.value = '올바른 이메일 주소를 입력해 주세요';
    return;
  }

  // 4. API 호출
  try {
    await authAPI.updateProfile({
      name: form.value.hospital_name,
      ceo_name: form.value.ceo_name,
      phone: form.value.phone,
      email: form.value.email,
      address: form.value.address,
      address_detail: form.value.address_detail,
      business_number: form.value.business_number,
    });
    originalForm.value = JSON.parse(JSON.stringify(form.value));
    successMessage.value = '저장되었습니다.';
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('프로필 저장 실패:', error);
    message.showAlert('저장에 실패했습니다.');
  }
};

const form = ref({
  hospital_name: '',
  ceo_name: '',
  login_id: '',
  phone: '',
  address: '',
  address_detail: '',
  email: '',
  business_number: '',
  business_license_path: '',
});

const originalForm = ref({});

const fetchProfile = async () => {
  try {
    const response = await authAPI.getMe();
    const data = response.data;
    form.value = {
      hospital_name: data.hospital_name || '',
      ceo_name: data.ceo_name || '',
      login_id: data.login_id || '',
      phone: data.phone || '',
      address: data.address || '',
      address_detail: data.address_detail || '',
      email: data.email || '',
      business_number: data.business_number || '',
      business_license_path: data.business_license_path || '',
    };
    originalForm.value = JSON.parse(JSON.stringify(form.value));
  } catch (error) {
    console.error('프로필 조회 실패:', error);
  }
};
const openAddress = () => {
  new daum.Postcode({
    oncomplete: (data) => {
      form.value.address = data.roadAddress;
    },
  }).open();
};
const onlyNumber = (e, field) => {
  form.value[field] = e.target.value.replace(/[^0-9]/g, '');
};
// 변경 감지
const hasChanges = computed(
  () => JSON.stringify(form.value) !== JSON.stringify(originalForm.value),
);

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

// 브라우저 닫기/새로고침 방지
const beforeUnload = (e) => {
  if (hasChanges.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

// 사업자등록증 파일명 추출
const extractFileName = (path) => {
  if (!path) return '';
  const parts = path.split('/');
  const fullName = parts[parts.length - 1];
  // 타임스탬프 제거 (예: 1234567890-파일명.pdf → 파일명.pdf)
  const dashIndex = fullName.indexOf('-');
  return dashIndex > -1 ? fullName.substring(dashIndex + 1) : fullName;
};

// 사업자등록증 미리보기
const previewLicense = () => {
  if (form.value.business_license_path) {
    window.open('/' + form.value.business_license_path, '_blank');
  }
};

onMounted(() => {
  fetchProfile();
  window.addEventListener('beforeunload', beforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
});
</script>
<style scoped lang="scss">
.profile {
  padding: 24px;
  color: $white;
  .info {
    margin-bottom: 56px;
  }
  .info-tit {
    @include font-16-bold;
    margin-bottom: 12px;
  }

  label {
    min-width: 152px;
    color: $white;
    padding: 12px 24px;
    background: $bg-op;
    border-radius: $radius-md;
  }
  .row_box {
    display: flex;
    gap: 36px;
    margin-bottom: 12px;
    align-items: center;
  }
  .form-group {
    flex: 1;
    display: flex;
    gap: 16px;
    align-items: center;
    input {
      @include font-16-regular;
      flex: 1;
      background: $bg-op;
      border: 1px solid $dark-line-gray;
      border-radius: $radius-sm;
      color: $white;
      padding: 12px;
      transition: border-color 0.2s;
      &:focus {
        border-color: $sub-color-2;
        outline: none;
      }
      &:disabled {
        opacity: 0.6;
        cursor: default;
      }
    }
    button {
      @include font-14-medium;
      height: calc(100% - 11px);
      color: $white;
      background: $main_gad;
      min-width: 96px;
      border-radius: $radius-sm;
    }
  }
  .address-group {
    input {
      cursor: pointer;
    }
    .search-btn {
      @include font-14-medium;
      color: $white;
      background: $main_gad;
      min-width: 72px;
      padding: 12px 8px;
      border-radius: $radius-sm;
      flex-shrink: 0;
      min-width: 96px;
      cursor: pointer;
    }
  }

  // 파일 인풋
  .file-name {
    display: flex;
    align-items: center;
    color: $white;
    text-decoration: underline;
    cursor: pointer;
    @include font-14-regular;
  }
  .file-none {
    @include font-14-regular;
    color: $white;
  }
  .preview {
    @include font-14-regular;
    color: $white;
    border: 1px solid $sub-color-2;
    padding: 12px 8px;
    flex-shrink: 0;
    height: fit-content;
    border-radius: $radius-sm;
  }
  .save-area {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    margin-top: 12px;

    .error-msg {
      @include font-14-regular;
      color: #ff4d4d;
    }
    .success-msg {
      @include font-14-regular;
      color: $dark-line-gray;
    }
    .save-btn {
      @include font-14-medium;
      color: $white;
      background: $main_gad;
      min-width: 120px;
      padding: 12px 24px;
      border-radius: $radius-sm;
      cursor: pointer;
    }
  }
}
</style>
