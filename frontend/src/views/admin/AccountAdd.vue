<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">가입계정목록</h2>
      <div class="breadcrumb">가입계정목록 &gt; 목록 &gt; 계정추가</div>
    </div>

    <div class="add-content">
      <button class="btn-back" @click="handleBack">
        <img src="/assets/icons/arrow_back.svg" alt="back" />
        뒤로가기
      </button>

      <h2 class="section-title">계정 추가</h2>

      <form class="add-form" @submit.prevent="handleSubmit">
        <!-- ID -->
        <div class="form-group">
          <label>ID</label>
          <div class="input-with-btn">
            <input
              v-model="form.loginId"
              placeholder="6~12자 영문,숫자조합"
              @input="onIdInput"
            />
            <button type="button" @click="checkDuplicateId">중복 확인</button>
          </div>
          <p class="validation-msg" v-if="idMessage" :class="idMsgType">
            {{ idMessage }}
          </p>
        </div>

        <!-- 비밀번호 -->
        <div class="form-group">
          <label>비밀번호</label>
          <div class="input-password">
            <input
              :type="showPw ? 'text' : 'password'"
              v-model="form.password"
              placeholder="비밀번호 (영문/숫자/특수문자 조합 8~15)"
              @input="validatePassword"
            />
            <button type="button" @click="showPw = !showPw">
              <img
                :src="
                  showPw
                    ? '/assets/icons/eye_show.svg'
                    : '/assets/icons/eye_hide.svg'
                "
              />
            </button>
          </div>
          <p class="validation-msg" v-if="pwMessage">{{ pwMessage }}</p>
        </div>

        <!-- 비밀번호 확인 -->
        <div class="form-group">
          <label>비밀번호 확인</label>
          <div class="input-password">
            <input
              :type="showPwConfirm ? 'text' : 'password'"
              v-model="form.passwordConfirm"
              placeholder="비밀번호를 한번 더 입력해 주세요."
              @input="validatePasswordConfirm"
            />
            <button type="button" @click="showPwConfirm = !showPwConfirm">
              <img
                :src="
                  showPwConfirm
                    ? '/assets/icons/eye_show.svg'
                    : '/assets/icons/eye_hide.svg'
                "
              />
            </button>
          </div>
          <p class="validation-msg" v-if="pwConfirmMessage">
            {{ pwConfirmMessage }}
          </p>
        </div>

        <!-- 이메일 -->
        <div class="form-group">
          <label>이메일</label>
          <div class="input-with-btn">
            <input
              v-model="form.email"
              placeholder="이메일을 입력해 주세요"
              @input="onEmailInput"
            />
            <button type="button" @click="checkDuplicateEmail">
              중복 확인
            </button>
          </div>
          <p class="validation-msg" v-if="emailMessage" :class="emailMsgType">
            {{ emailMessage }}
          </p>
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
            placeholder="하이픈 '-' 제외 숫자만 입력"
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

        <!-- 사업자번호 -->
        <div class="form-group">
          <label>사업자번호</label>
          <input
            v-model="form.businessNumber"
            placeholder="하이픈 '-' 제외 숫자만 입력"
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
            <button type="button" @click="$refs.fileInput.click()">
              파일첨부
            </button>
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
          type="submit"
          class="btn-submit"
          :disabled="!isFormValid || isProcessing"
        >
          {{ isFormValid ? '생성' : '정보를 모두 입력해 주세요' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { onBeforeRouteLeave } from 'vue-router';
import { adminAPI } from '@/api/admin';
import { authAPI } from '@/api/auth';
import { UseMessageStore } from '@/store/message';

const router = useRouter();
const message = UseMessageStore();

const showPw = ref(false);
const showPwConfirm = ref(false);
const fileName = ref('');
const selectedFile = ref(null);
const isIdChecked = ref(false);
const isEmailChecked = ref(false);
const isProcessing = ref(false);

// 유효성 메시지
const idMessage = ref('');
const idMsgType = ref('');
const pwMessage = ref('');
const pwConfirmMessage = ref('');
const emailMessage = ref('');
const emailMsgType = ref('');
const phoneMessage = ref('');
const bizMessage = ref('');

const form = ref({
  loginId: '',
  password: '',
  passwordConfirm: '',
  email: '',
  hospitalName: '',
  ceoName: '',
  phone: '',
  address: '',
  addressDetail: '',
  businessNumber: '',
});

// 전체 유효성
const isFormValid = computed(() => {
  const f = form.value;
  const idRegex = /^[a-zA-Z0-9]{6,12}$/;
  const pwRegex =
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{8,15}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return (
    idRegex.test(f.loginId) &&
    isIdChecked.value &&
    pwRegex.test(f.password) &&
    f.password === f.passwordConfirm &&
    emailRegex.test(f.email) &&
    isEmailChecked.value &&
    f.hospitalName &&
    f.ceoName &&
    f.phone &&
    f.address &&
    f.businessNumber &&
    selectedFile.value
  );
});

// 변경 감지 (이탈 방지)
const isDirty = computed(() => {
  const f = form.value;
  return (
    f.loginId ||
    f.password ||
    f.email ||
    f.hospitalName ||
    f.ceoName ||
    f.phone ||
    f.address ||
    f.addressDetail ||
    f.businessNumber ||
    selectedFile.value
  );
});

// ── 유효성 함수 ──

function onIdInput() {
  isIdChecked.value = false;
  const id = form.value.loginId;
  if (!id) {
    idMessage.value = '';
    idMsgType.value = '';
  } else if (!/^[a-zA-Z0-9]{6,12}$/.test(id)) {
    idMessage.value = '6자이상 12자이하로 만들어 주세요';
    idMsgType.value = 'error';
  } else {
    idMessage.value = '중복 확인을 해주세요.';
    idMsgType.value = '';
  }
}

async function checkDuplicateId() {
  if (!/^[a-zA-Z0-9]{6,12}$/.test(form.value.loginId)) {
    idMessage.value = '6자이상 12자이하로 만들어 주세요';
    idMsgType.value = 'error';
    return;
  }
  try {
    const res = await authAPI.checkId(form.value.loginId);
    if (res.data.success) {
      isIdChecked.value = true;
      idMessage.value = '사용 가능한 ID입니다.';
      idMsgType.value = 'success';
    } else {
      isIdChecked.value = false;
      idMessage.value = res.data.message;
      idMsgType.value = 'error';
    }
  } catch (e) {
    idMessage.value = e.response?.data?.message || 'ID 확인에 실패했습니다.';
    idMsgType.value = 'error';
  }
}

function validatePassword() {
  const pw = form.value.password;
  const regex =
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{8,15}$/;
  if (!pw) {
    pwMessage.value = '';
  } else if (!regex.test(pw)) {
    pwMessage.value = '영문/숫자/특수문자 조합 8~15자 이내로 입력해주세요';
  } else {
    pwMessage.value = '';
  }
  validatePasswordConfirm();
}

function validatePasswordConfirm() {
  if (!form.value.passwordConfirm) {
    pwConfirmMessage.value = '';
  } else if (form.value.password !== form.value.passwordConfirm) {
    pwConfirmMessage.value = '비밀번호가 일치하지않습니다';
  } else {
    pwConfirmMessage.value = '';
  }
}

function onEmailInput() {
  isEmailChecked.value = false;
  const email = form.value.email;
  if (!email) {
    emailMessage.value = '';
    emailMsgType.value = '';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailMessage.value = '올바른 이메일 주소를 입력해 주세요';
    emailMsgType.value = 'error';
  } else {
    emailMessage.value = '중복 확인을 해주세요.';
    emailMsgType.value = '';
  }
}

async function checkDuplicateEmail() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    emailMessage.value = '올바른 이메일 주소를 입력해 주세요';
    emailMsgType.value = 'error';
    return;
  }
  try {
    const res = await authAPI.checkEmail(form.value.email);
    if (res.data.success) {
      isEmailChecked.value = true;
      emailMessage.value = '사용 가능한 이메일입니다.';
      emailMsgType.value = 'success';
    } else {
      isEmailChecked.value = false;
      emailMessage.value = res.data.message;
      emailMsgType.value = 'error';
    }
  } catch (e) {
    emailMessage.value =
      e.response?.data?.message || '이메일 확인에 실패했습니다.';
    emailMsgType.value = 'error';
  }
}

function validatePhone() {
  const before = form.value.phone;
  form.value.phone = before.replace(/[^0-9]/g, '');
  if (before !== form.value.phone) {
    phoneMessage.value = '숫자만 입력 가능합니다';
  } else {
    phoneMessage.value = '';
  }
}

function validateBusinessNumber() {
  const before = form.value.businessNumber;
  form.value.businessNumber = before.replace(/[^0-9]/g, '');
  if (before !== form.value.businessNumber) {
    bizMessage.value = '숫자만 입력 가능합니다';
  } else {
    bizMessage.value = '';
  }
}

// 파일 선택
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

// 주소 검색
function searchAddress() {
  new daum.Postcode({
    oncomplete: function (data) {
      form.value.address = data.roadAddress;
    },
  }).open();
}

// 뒤로가기
function handleBack() {
  if (isDirty.value) {
    message.showConfirm(
      '입력한 내용이 있습니다.\n페이지를 나가시겠습니까?',
      () => router.push('/admin/accounts'),
    );
  } else {
    router.push('/admin/accounts');
  }
}

// 생성
async function handleSubmit() {
  if (!isFormValid.value || isProcessing.value) return;
  isProcessing.value = true;

  const formData = new FormData();
  formData.append('loginId', form.value.loginId);
  formData.append('password', form.value.password);
  formData.append('email', form.value.email);
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
    await adminAPI.createAccount(formData);
    skipGuard.value = true;
    message.showAlert('계정 생성이 완료되었습니다.', () => {
      router.push('/admin/accounts');
    });
  } catch (e) {
    message.showAlert(e.response?.data?.message || '계정 생성에 실패했습니다.');
  } finally {
    isProcessing.value = false;
  }
}

// 이탈 방지
const skipGuard = ref(false);

onBeforeRouteLeave((to, from, next) => {
  if (skipGuard.value || !isDirty.value) {
    next();
  } else {
    message.showConfirm(
      '입력한 내용이 있습니다.\n페이지를 나가시겠습니까?',
      () => {
        skipGuard.value = true;
        next();
      },
      () => next(false),
    );
  }
});

function handleBeforeUnload(e) {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload));
onBeforeUnmount(() =>
  window.removeEventListener('beforeunload', handleBeforeUnload),
);
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
  margin-bottom: 16px;
  img {
    width: 12px;
    height: 12px;
  }
  &:hover {
    color: $white;
  }
}

.section-title {
  @include font-20-bold;
  margin-bottom: 24px;
}

.add-form {
  max-width: 556px;

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

      &::placeholder {
        color: $dark-input-gray;
      }
      &:focus {
        border-color: $sub-color-2;
      }
      &:read-only {
        background-color: darken($dark-input, 5%);
        cursor: default;
      }
    }
  }

  .validation-msg {
    margin-top: 4px;
    @include font-12-regular;
    color: $red;
    &.success {
      color: $validation-sucess;
    }
    &.error {
      color: $red;
    }
  }

  .input-with-btn {
    display: flex;
    gap: $spacing-md;

    input {
      flex: 1;
    }

    button {
      min-width: 136px;
      min-height: 32px;
      padding: $spacing-md;
      background: $main-gad;
      border: none;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-medium;
      white-space: nowrap;
      cursor: pointer;
      &:hover {
        background-color: $main-color;
      }
    }
  }

  .input-password {
    position: relative;

    input {
      padding-right: 50px;
    }

    button {
      position: absolute;
      right: $spacing-md;
      top: 50%;
      transform: translateY(-50%);
      padding: $spacing-xs;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;

      img {
        width: 24px;
        height: 24px;
        opacity: 0.6;
      }
      &:hover img {
        opacity: 1;
      }
    }
  }
}

.btn-submit {
  width: 100%;
  min-height: 32px;
  padding: 14px;
  margin-top: 32px;
  background: $main-color;
  color: $white;
  border: none;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: $sub-color;
  }

  &:disabled {
    background: $dark-line-gray;
    color: $gray;
    cursor: not-allowed;
  }
}
</style>
