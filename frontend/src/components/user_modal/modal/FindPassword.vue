<template>
  <div class="find-password">
    <h2 class="modal-title">비밀번호 찾기</h2>

    <!-- 1단계: ID + 이메일 입력 -->
    <form v-if="step === 1" @submit.prevent="handleStep1">
      <div class="form-group">
        <label for="loginId">ID</label>
        <input
          type="text"
          id="loginId"
          v-model="form.loginId"
          placeholder="가입시 입력한 ID를 입력해 주세요"
        />
      </div>

      <div class="form-group">
        <label for="email">이메일</label>
        <input
          type="email"
          id="email"
          v-model="form.email"
          placeholder="가입시 입력한 이메일 주소를 입력해 주세요"
          @input="validateEmail"
        />
        <p v-if="emailError" class="error-msg">올바른 이메일 주소를 입력해 주세요.</p>
      </div>

      <button type="submit" class="btn-submit" :disabled="loading">다음</button>
    </form>

    <!-- 2단계: 인증번호 입력 -->
    <div v-else-if="step === 2">
      <div class="resend-row">
        <span class="resend-link" @click="handleResend">인증번호가 오지 않을경우 (클릭)</span>
        <span class="resend-info">30초마다 재전송가능</span>
      </div>

      <form @submit.prevent="handleStep2">
        <div class="form-group">
          <label for="code">인증번호</label>
          <input
            type="text"
            id="code"
            v-model="form.code"
            placeholder="인증번호입력 (숫자만 입력 가능)"
            @input="handleCodeInput"
          />
          <p v-if="codeError" class="error-msg">숫자만 입력 가능합니다</p>
        </div>

        <button type="submit" class="btn-submit" :disabled="loading">인증번호 확인</button>
      </form>
    </div>

    <!-- 3단계: 새 비밀번호 설정 -->
    <form v-else-if="step === 3" @submit.prevent="handleStep3">
      <div class="form-group">
        <label for="newPassword">새 비밀번호</label>
        <div class="input-wrapper">
          <input
            :type="showPassword ? 'text' : 'password'"
            id="newPassword"
            v-model="form.newPassword"
            placeholder="새 비밀번호 (영문/숫자/특수문자 조합 8~15)"
            @input="validatePassword"
          />
          <img
            :src="showPassword ? eyeOnIcon : eyeOffIcon"
            class="eye-icon"
            @click="showPassword = !showPassword"
            alt=""
          />
        </div>
        <p v-if="passwordError" class="error-msg">영문/숫자/특수문자 조합 8~15자로 구성해 주세요.</p>
      </div>

      <div class="form-group">
        <label for="confirmPassword">새 비밀번호 확인</label>
        <div class="input-wrapper">
          <input
            :type="showConfirmPassword ? 'text' : 'password'"
            id="confirmPassword"
            v-model="form.confirmPassword"
            placeholder="새 비밀번호 확인"
            @input="validateConfirmPassword"
          />
          <img
            :src="showConfirmPassword ? eyeOnIcon : eyeOffIcon"
            class="eye-icon"
            @click="showConfirmPassword = !showConfirmPassword"
            alt=""
          />
        </div>
        <p v-if="confirmPasswordError" class="error-msg">비밀번호가 일치하지 않습니다.</p>
      </div>

      <button type="submit" class="btn-submit" :disabled="loading">비밀번호 변경</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useModalStore } from '@/store/modal';
import { UseMessageStore } from '@/store/message';
import { authAPI } from '@/api/auth';

const modal = useModalStore();
const message = UseMessageStore();

const step = ref(1);
const loading = ref(false);
const emailError = ref(false);
const codeError = ref(false);
const passwordError = ref(false);
const confirmPasswordError = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const lastSendTime = ref(0);

const eyeOffIcon = '/assets/icons/eye_hide.svg';
const eyeOnIcon = '/assets/icons/eye_show.svg';

const form = ref({
  loginId: '',
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
});

// 이메일 실시간 검증
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailError.value = form.value.email !== '' && !emailRegex.test(form.value.email);
  return !emailError.value;
};

// 인증번호 입력 핸들러 (숫자만)
const handleCodeInput = () => {
  const original = form.value.code;
  form.value.code = original.replace(/[^0-9]/g, '');
  codeError.value = original !== form.value.code;
};

// 비밀번호 유효성 (영문+숫자+특수문자 조합 8~15자)
const validatePassword = () => {
  const pw = form.value.newPassword;
  if (pw === '') {
    passwordError.value = false;
    return true;
  }
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
  const validLength = pw.length >= 8 && pw.length <= 15;
  passwordError.value = !(hasLetter && hasNumber && hasSpecial && validLength);

  // 비밀번호 변경 시 확인도 재검증
  if (form.value.confirmPassword !== '') {
    validateConfirmPassword();
  }
  return !passwordError.value;
};

// 비밀번호 확인 일치 검증
const validateConfirmPassword = () => {
  const cpw = form.value.confirmPassword;
  if (cpw === '') {
    confirmPasswordError.value = false;
    return true;
  }
  confirmPasswordError.value = form.value.newPassword !== cpw;
  return !confirmPasswordError.value;
};

// 1단계: 정보 입력 → API 호출
const handleStep1 = async () => {
  if (emailError.value) return;
  if (!form.value.loginId || !form.value.email) {
    message.showAlert('ID와 이메일을 모두 입력해 주세요.');
    return;
  }

  loading.value = true;
  try {
    const res = await authAPI.findPassword(form.value.loginId, form.value.email);
    if (res.data.success) {
      lastSendTime.value = Date.now();
      message.showAlert('입력하신 이메일로 인증번호를 보냈습니다.', () => {
        step.value = 2;
      });
    }
  } catch (error) {
    const msg = error.response?.data?.message || '서버 오류가 발생했습니다.';
    message.showAlert(msg);
  } finally {
    loading.value = false;
  }
};

// 2단계: 인증번호 확인
const handleStep2 = async () => {
  if (!form.value.code) {
    message.showAlert('인증번호를 입력해 주세요.');
    return;
  }

  loading.value = true;
  try {
    const res = await authAPI.verifyCode({
      email: form.value.email,
      code: form.value.code,
      type: 'find_password',
    });
    if (res.data.success) {
      step.value = 3;
    }
  } catch (error) {
    message.showAlert('인증번호가 일치하지 않습니다.');
  } finally {
    loading.value = false;
  }
};

// 3단계: 비밀번호 변경
const handleStep3 = async () => {
  if (passwordError.value || confirmPasswordError.value) return;
  if (!form.value.newPassword || !form.value.confirmPassword) {
    message.showAlert('비밀번호를 모두 입력해 주세요.');
    return;
  }

  loading.value = true;
  try {
    const res = await authAPI.resetPassword(
      form.value.loginId,
      form.value.email,
      form.value.newPassword
    );
    if (res.data.success) {
      message.showAlert('비밀번호를 변경하였습니다.\n변경된 비밀번호로 로그인 해주세요.', () => {
        modal.close();
      });
    }
  } catch (error) {
    const msg = error.response?.data?.message || '비밀번호 변경에 실패했습니다.';
    message.showAlert(msg);
  } finally {
    loading.value = false;
  }
};

// 재발송
const handleResend = async () => {
  const elapsed = Math.floor((Date.now() - lastSendTime.value) / 1000);
  if (elapsed < 30) {
    message.showAlert(`${30 - elapsed}초 후에 다시 시도해 주세요.`);
    return;
  }

  try {
    await authAPI.sendCode({ email: form.value.email, type: 'find_password' });
    lastSendTime.value = Date.now();
    message.showAlert('인증번호를 재전송 하였습니다.');
  } catch (error) {
    message.showAlert('인증번호 발송에 실패했습니다.');
  }
};

defineExpose({ step });
</script>

<style lang="scss" scoped>
.find-password {
  width: 610px;
  padding: 20px 0;
}

.modal-title {
  font-weight: $font-weight-regular;
  font-size: 24px;
  color: $white;
  text-align: center;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 39px;

  label {
    display: block;
    @include font-14-bold;
    color: $white;
    margin-bottom: 8px;
  }

  input {
    width: 100%;
    padding: 12px;
    background-color: $dark-input;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-md;
    color: $white;
    @include font-14-regular;
    transition: border-color $transition-fast;

    &::placeholder {
      color: $dark-line-gray;
    }

    &:focus {
      border-color: $sub-color-2;
    }
  }
}

.input-wrapper {
  position: relative;

  input {
    padding-right: 44px;
  }

  .eye-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }
}

.error-msg {
  color: $red;
  @include font-12-regular;
  margin-top: 6px;
}

.resend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.resend-link {
  @include font-14-bold;
  color: $white;
  cursor: pointer;
  text-decoration: underline;
}

.resend-info {
  @include font-12-regular;
  color: $dark-line-gray;
}

.btn-submit {
  width: 100%;
  padding: $spacing-md;
  background-color: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-bold;
  transition: background-color $transition-fast;

  &:hover {
    background-color: $sub-color;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
