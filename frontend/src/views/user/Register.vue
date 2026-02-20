<template>
  <div class="page_header">
<div class="logo" @click="router.push('/login')" style="cursor:pointer">

      <img :src="logoSrc" alt="OsteoAge" />

    </div>
        <span class="title">회원가입</span>
  </div>
  <div class="register-page">
    <div class="register-container">
      <!-- 헤더 -->
      <div class="register-header">

        <span class="progress">회원가입 진행도 {{ step }}/2</span>
      </div>

      <!-- Step 1: 계정 정보 -->
      <form v-if="step === 1" class="register-form" @submit.prevent="goToStep2">
        <!-- ID -->
        <div class="form-group">
          <label>ID</label>
          <div class="input-with-btn">
            <input v-model="form.loginId" 
       placeholder="6~12자 영문,숫자조합, 가입 후 변경 불가" 
       @input="validateLoginId" />
            <button type="button" @click="checkDuplicateId">중복 확인</button>
          </div>
         <div class="validation-text" :class="idMessageType">{{ idMessage }}</div>
        </div>

        <!-- 비밀번호 -->
        <div class="form-group">
          <label>비밀번호</label>
          <div class="input-password">
<input :type="showPw ? 'text' : 'password'" v-model="form.password" 
       placeholder="비밀번호 (영문/숫자/특수문자 조합 8~15)" @input="validatePassword" />
            <button type="button" @click="showPw = !showPw">
              <img :src="showPw ? eyeShowIcon : eyeHideIcon" />
            </button>
          </div>
          <div class="validation-text error">{{ pwMessage }}</div>
        </div>

        <!-- 비밀번호 확인 -->
        <div class="form-group">
          <label>비밀번호 확인</label>
          <div class="input-password">
<input :type="showPwConfirm ? 'text' : 'password'" v-model="form.passwordConfirm" 
       placeholder="비밀번호를 한번 더 입력해 주세요." @input="validatePasswordConfirm" />
            <button type="button" @click="showPwConfirm = !showPwConfirm">
              <img :src="showPwConfirm ? eyeShowIcon : eyeHideIcon" />
            </button>
          </div>
<div class="validation-text error">{{ pwConfirmMessage }}</div>
          
        </div>

        <!-- 이메일 -->
        <div class="form-group">
          <label>이메일</label>
          <div class="input-with-btn">
            <input v-model="form.email" placeholder="이메일을 입력해 주세요" @input="validateEmail" />
            <button type="button" @click="sendVerificationCode">
  {{ isCodeSent ? '재전송' : '인증번호 전송' }}
</button>
          </div>
          <div class="validation-text" :class="emailMessageType">{{ emailMessage }}</div>
        </div>

        <!-- 인증번호 -->
        <div class="form-group">
          <label>인증번호</label>
          <div class="input-with-btn">
            <input v-model="form.verificationCode" placeholder="인증번호를 입력해 주세요" 
       @input="validateCode" maxlength="6" />
            <button type="button" @click="verifyCode">인증번호 확인</button>
          </div>
          <div class="validation-text" :class="codeMessageType">{{ codeMessage }}</div>
        </div>

        <button type="submit" class="btn-next" :disabled="!isStep1Valid">
          {{ isStep1Valid ? '다음' : '가입 정보를 모두 입력해 주세요' }}
        </button>
      </form>

      <!-- Step 2: 병원 정보 -->
      <form v-else class="register-form" @submit.prevent="handleRegister">
        <!-- 병원명 -->
        <div class="form-group">
          <label>병원명</label>
          <input v-model="form.hospitalName" />
          <div class="validation-text"></div>
        </div>

        <!-- 대표자명 -->
        <div class="form-group">
          <label>대표자명</label>
          <input v-model="form.ceoName" />
          <div class="validation-text"></div>
        </div>

<!-- 연락처 -->
<div class="form-group">
  <label>연락처</label>
  <input v-model="form.phone" placeholder="하이픈 '-' 제외 숫자만 입력" 
         @input="validatePhone" maxlength="11" />
  <div class="validation-text error">{{ phoneMessage }}</div>
</div>

<!-- 병원주소 -->
<div class="form-group">
  <label>병원주소</label>
  <div class="input-with-btn">
    <input v-model="form.address" readonly @click="searchAddress" style="cursor:pointer" />
    <button type="button" @click="searchAddress">주소 검색</button>
  </div>
  <div class="validation-text"></div>
</div>

        <!-- 상세주소 -->
        <div class="form-group">
          <label>상세주소</label>
          <input v-model="form.addressDetail" />
          <div class="validation-text"></div>
        </div>

<!-- 사업자번호 -->
<div class="form-group">
  <label>사업자번호</label>
  <input v-model="form.businessNumber" placeholder="하이픈 '-' 제외 숫자만 입력" 
         @input="validateBusinessNumber" maxlength="10" />
  <div class="validation-text error">{{ bizMessage }}</div>
</div>

<!-- 사업자등록증 -->
<div class="form-group">
  <label>사업자등록증</label>
  <div class="input-with-btn">
    <input :value="fileName" readonly placeholder="png,jpg,jpeg,pdf, 최대10mb" 
           @click="$refs.fileInput.click()" style="cursor:pointer" />
    <button type="button" @click="$refs.fileInput.click()">파일첨부</button>
    <input type="file" ref="fileInput" @change="handleFileChange" 
           accept=".png,.jpg,.jpeg,.pdf" hidden />
  </div>
  <div class="validation-text"></div>
</div>

        <!-- 약관 동의 -->
        <div class="terms-group">
          <label class="checkbox-item">
            <input type="checkbox" v-model="agreeAll" @change="toggleAll" />
            <span>전체동의</span>
          </label>
          <hr />
          <label class="checkbox-item">
            <input type="checkbox" v-model="form.agreeTerms" />
            <span><a href="#">이용약관</a> 동의 (필수)</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" v-model="form.agreePrivacy" />
            <span><a href="#">서비스 이용을 위한 개인정보 수집 및 이용</a> 동의 (필수)</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" v-model="form.agreeMarketing" />
            <span><a href="#">회원가입을 위한 개인정보 수집 및 이용</a> 동의 (필수)</span>
          </label>
        </div>

<button type="submit" class="btn-submit" :disabled="!isStep2Valid">
  {{ isStep2Valid ? '가입요청' : '가입 정보를 모두 입력해 주시고 서비스 정책에 동의해 주세요.' }}
</button>
      </form>
    </div>
  </div>
  
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { authAPI } from '@/api/auth';
import { UseMessageStore } from '@/store/message';
const message = UseMessageStore();
const router = useRouter();

const logoSrc = '/assets/logo/logo.svg';
const eyeHideIcon = '/assets/icons/eye_hide.svg';
const eyeShowIcon = '/assets/icons/eye_show.svg';

const step = ref(1);
const showPw = ref(false);
const showPwConfirm = ref(false);
const fileName = ref('');
const selectedFile = ref(null);

// 검증 상태
const isIdChecked = ref(false);
const isEmailVerified = ref(false);
// id 유효성
const idMessage = ref('');
const idMessageType = ref(''); // 'success' or 'error'


// 비번 유효성
const pwMessage = ref('');
const pwConfirmMessage = ref('');

// 이메일 유효성
const emailMessage = ref('');
const emailMessageType = ref('');


//인증번호 부분
// 인증번호 재전송 
const isCodeSent = ref(false);
const cooldown = ref(0);
let cooldownTimer = null;

const codeMessage = ref('');
const codeMessageType = ref('');


//연락처 - 숫자 필터 
const phoneMessage = ref('');
const bizMessage = ref('');

const form = ref({
  // Step 1
  loginId: '',
  password: '',
  passwordConfirm: '',
  email: '',
  verificationCode: '',
  // Step 2
  hospitalName: '',
  ceoName: '',
  phone: '',
  address: '',
  addressDetail: '',
  businessNumber: '',
  // 약관
  agreeTerms: false,
  agreePrivacy: false,
  agreeMarketing: false,
});

// Step 1 유효성
const isStep1Valid = computed(() => {
  return form.value.loginId && 
         form.value.password && 
         form.value.passwordConfirm &&
         form.value.password === form.value.passwordConfirm &&
         form.value.email &&
         isIdChecked.value &&
         isEmailVerified.value;
});

// Step 2 유효성
const isStep2Valid = computed(() => {
  return form.value.hospitalName &&
         form.value.ceoName &&
         form.value.phone &&
         form.value.address &&
         form.value.businessNumber &&
         selectedFile.value &&
         form.value.agreeTerms &&
         form.value.agreePrivacy &&
         form.value.agreeMarketing;
});


function handlePopState(e) {
  if (step.value === 2) {
    step.value = 1;
  }
}

// 전체동의
const agreeAll = computed({
  get: () => form.value.agreeTerms && form.value.agreePrivacy && form.value.agreeMarketing,
  set: (val) => {
    form.value.agreeTerms = val;
    form.value.agreePrivacy = val;
    form.value.agreeMarketing = val;
  }
});

function toggleAll() {
  const val = agreeAll.value;
  form.value.agreeTerms = val;
  form.value.agreePrivacy = val;
  form.value.agreeMarketing = val;
}

function validateLoginId() {
  isIdChecked.value = false; // ID 변경 시 중복확인 초기화
  const id = form.value.loginId;
  const regex = /^[a-zA-Z0-9]{6,12}$/;

  if (!id) {
    idMessage.value = '';
    idMessageType.value = '';
  } else if (id.length < 6 || id.length > 12) {
    idMessage.value = '6~12자의 영문,숫자를 조합해 주세요';
    idMessageType.value = 'error';
  } else if (!regex.test(id)) {
    idMessage.value = '영문, 숫자만 사용 가능합니다.';
    idMessageType.value = 'error';
  } else {
    idMessage.value = '중복 확인을 해주세요.';
    idMessageType.value = '';
  }
}

// ID 중복확인 수정
async function checkDuplicateId() {
  const regex = /^[a-zA-Z0-9]{6,12}$/;
  if (!regex.test(form.value.loginId)) {
    idMessage.value = '6~12자의 영문,숫자를 조합해 주세요';
    idMessageType.value = 'error';
    return;
  }
  try {
    const res = await authAPI.checkId(form.value.loginId);
    if (res.data.success) {
      isIdChecked.value = true;
      idMessage.value = '사용 가능한 ID입니다.';
      idMessageType.value = 'success';
    } else {
      isIdChecked.value = false;
      idMessage.value = res.data.message;
      idMessageType.value = 'error';
    }
  } catch (error) {
    idMessage.value = error.response?.data?.message || 'ID 확인에 실패했습니다.';
    idMessageType.value = 'error';
  }
}

// 비번 유효성

function validatePassword() {
  const pw = form.value.password;
  const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{8,15}$/;

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
  const pw = form.value.password;
  const pwConfirm = form.value.passwordConfirm;

  if (!pwConfirm) {
    pwConfirmMessage.value = '';
  } else if (pw !== pwConfirm) {
    pwConfirmMessage.value = '비밀번호가 일치하지 않습니다';
  } else {
    pwConfirmMessage.value = '';
  }
}

//이메일 유효성
function validateEmail() {
  const email = form.value.email;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    emailMessage.value = '';
    emailMessageType.value = '';
  } else if (!regex.test(email)) {
    emailMessage.value = '올바른 이메일 주소를 입력해 주세요';
    emailMessageType.value = 'error';
  } else {
    emailMessage.value = '';
    emailMessageType.value = '';
  }
}


async function sendVerificationCode() {
  // 이메일 유효성 체크
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(form.value.email)) {
    emailMessage.value = '올바른 이메일 주소를 입력해 주세요';
    emailMessageType.value = 'error';
    return;
  }

  // 30초 쿨다운 체크
  if (cooldown.value > 0) {
message.showTimer('인증번호 재전송 대기', cooldown.value);
    return;
  }

  try {
    await authAPI.sendCode({ email: form.value.email, type: 'register' });
    isCodeSent.value = true;
    emailMessage.value = '인증번호를 전송하였습니다. 10분내로 입력해 주세요.';
    emailMessageType.value = 'success';

    // 30초 쿨다운 시작
    cooldown.value = 30;
    cooldownTimer = setInterval(() => {
      cooldown.value--;
      if (cooldown.value <= 0) clearInterval(cooldownTimer);
    }, 1000);
  } catch (error) {
    emailMessage.value = error.response?.data?.message || '인증번호 전송에 실패했습니다.';
    emailMessageType.value = 'error';
  }
}


function validateCode() {
  // 숫자만 허용
  form.value.verificationCode = form.value.verificationCode.replace(/[^0-9]/g, '');
  
  if (form.value.verificationCode && !/^\d+$/.test(form.value.verificationCode)) {
    codeMessage.value = '숫자만 입력 가능합니다';
    codeMessageType.value = 'error';
  } else {
    codeMessage.value = '';
    codeMessageType.value = '';
  }
}

// 인증번호 확인
async function verifyCode() {
  try {
    const res = await authAPI.verifyCode({
      email: form.value.email,
      code: form.value.verificationCode,
      type: 'register'
    });
    if (res.data.success) {
      isEmailVerified.value = true;
      codeMessage.value = '인증번호가 일치합니다';
      codeMessageType.value = 'success';
    }
  } catch (error) {
    codeMessage.value = '인증번호가 일치하지 않습니다';
    codeMessageType.value = 'error';
  }
}




// 주소 검색 (카카오 주소 API)
function searchAddress() {
  // TODO: 카카오 주소 API
  new daum.Postcode({
    oncomplete: function(data) {
      form.value.address = data.roadAddress;
    }
  }).open();
}

// 전화번호 유효성
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
// Step 1 → Step 2
function goToStep2() {
  if (isStep1Valid.value) {
    step.value = 2;
    history.pushState({ step: 2 }, '', '/register?step=2');
  }
}

// 회원가입
async function handleRegister() {
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
    await authAPI.register(formData);
    message.showAlert('가입요청이 완료되었습니다.\n관리자 승인 후 사용 가능합니다.', () => {
      router.push('/login');
    });
  } catch (error) {
    message.showAlert(error.response?.data?.message || '회원가입에 실패했습니다.');
  }

  
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState);
});

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopState);
});
</script>
<style lang="scss" scoped>
.page_header{
  padding:20px 20px 0 20px;
  position:fixed;
  top:0;
  left:0;
  display:flex;
  gap:12px;
  color:$white;
  align-items:center;
  @include font-20-bold;
  .logo{
    padding:16px 18px;
  }
  img{
    max-width:106px;
  }

}
.register-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: $dark-bg;
  padding: $spacing-xl 0;
}

.register-container {
  width: 100%;
  max-width: 556px;
  padding: $spacing-xl 0;
}

.register-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  color : $dark-text;
  img {
    height: 32px;
  }

  .title {
    @include font-16-regular;

    margin-left: $spacing-md;
  }

  .progress {
    @include font-14-regular;
    margin-left: auto;
  }
}

.register-form {
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
        border: 1px solid $sub-color-2;
      }

      &:read-only {
        background-color: darken($dark-input, 5%);
        cursor: default;
      }
    }
.validation-text {
  height: 20px;
  color: $red;
  &.error { color: $red; }
  &.success { color: $validation-sucess ; }
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
      padding: $spacing-md;
      background: $main-gad;
      border: none;
      border-radius: $radius-sm;
      color: $white;
      @include font-14-medium;
      white-space: nowrap;
      transition: all $transition-fast;

      &:hover {
        background-color: $main-color;
        color: $white;
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

      img {
        width: 24px;
        height: 24px;
        opacity: 0.6;
        transition: opacity $transition-fast;
      }

      &:hover img {
        opacity: 1;
      }
    }
  }
}

.terms-group {
  margin-top: $spacing-xl;
  padding: $spacing-lg;
  background-color: rgba($white, 0.05);
  border-radius: $radius-md;

  hr {
    border: none;
    border-top: 1px solid $dark-line-gray;
    margin: $spacing-md 0;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-sm;
    cursor: pointer;

    &:last-child {
      margin-bottom: 0;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      min-height: auto;
      accent-color: $main-color;
      cursor: pointer;
    }

    span {
      @include font-14-regular;
      color: $white;

      a {
        color: $sub-color-2;
        text-decoration: underline;

        &:hover {
          color: $main-color;
        }
      }
    }
  }
}

.btn-next,
.btn-submit {
  width: 100%;
  padding: $spacing-md;
  margin-top: $spacing-xl;
  background-color: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  transition: background-color $transition-fast;

  &:hover:not(:disabled) {
    background-color: $sub-color;
  }

  &:disabled {
    background-color: $dark-line-gray;
    color: $gray;
    cursor: not-allowed;
  }
}
</style>
