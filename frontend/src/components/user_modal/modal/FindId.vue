<template>
  <div class="find-id">
    <h2 class="modal-title">ID 찾기</h2>

    <!-- 1단계: 정보 입력 -->
    <form v-if="step === 1" @submit.prevent="handleStep1">
      <div class="form-group">
        <label for="email">이메일</label>
        <input
          type="email"
          id="email"
          v-model="form.email"
          placeholder="가입시 입력한 이메일 주소를 입력해 주세요"
          @blur="validateEmail"
        />
        <p v-if="emailError" class="error-msg">
          올바른 이메일 주소를 입력해 주세요
        </p>
      </div>

      <div class="form-group">
        <label for="ceoName">대표자명</label>
        <input
          type="text"
          id="ceoName"
          v-model="form.ceoName"
          placeholder="가입시 입력한 대표자명을 입력해 주세요"
        />
      </div>

      <button type="submit" class="btn-submit" :disabled="loading">다음</button>
    </form>

    <!-- 2단계: 인증번호 입력 -->
    <div v-else-if="step === 2">
      <div class="resend-row">
        <span class="resend-link" @click="handleResend"
          >인증번호가 오지 않을경우 (클릭)</span
        >
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
            @input="form.code = form.code.replace(/[^0-9]/g, '')"
          />
        </div>

        <button type="submit" class="btn-submit" :disabled="loading">
          인증번호 확인
        </button>
      </form>
    </div>

    <!-- 3단계: ID 확인 결과 -->
    <!-- <div v-else-if="step === 3" class="result-wrap">
      <p class="result-text">고객님의 ID는 [{{ foundId }}] 입니다.</p>
      <button class="btn-submit" @click="handleClose">닫기</button>
    </div> -->
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
const foundId = ref('');
const lastSendTime = ref(0);

const form = ref({
  email: '',
  ceoName: '',
  code: '',
});

// 이메일 형식 검증
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailError.value =
    form.value.email !== '' && !emailRegex.test(form.value.email);
  return !emailError.value;
};

// 1단계: 정보 입력 → API 호출
const handleStep1 = async () => {
  if (!validateEmail() || !form.value.email || !form.value.ceoName) {
    if (!form.value.email || !form.value.ceoName) {
      message.showAlert('이메일과 대표자명을 모두 입력해 주세요.');
    }
    return;
  }

  loading.value = true;
  try {
    const res = await authAPI.findId(form.value.email, form.value.ceoName);
    if (res.data.success) {
      lastSendTime.value = Date.now();
      step.value = 2;
    }
  } catch (error) {
    const msg = error.response?.data?.message || '서버 오류가 발생했습니다.';
    message.showAlert(msg);
  } finally {
    loading.value = false;
  }
};

// 2단계: 인증번호 확인
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
      type: 'find_id',
    });
    if (res.data.success) {
      message.showAlert(`고객님의 ID는 [${res.data.loginId}] 입니다.`, () => {
        modal.close();
      });
    }
  } catch (error) {
    const msg =
      error.response?.data?.message ||
      '인증번호가 올바르지 않거나 만료되었습니다.';
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
    await authAPI.sendCode({ email: form.value.email, type: 'find_id' });
    lastSendTime.value = Date.now();
    message.showAlert('인증번호를 재전송 하였습니다.');
  } catch (error) {
    message.showAlert('인증번호 발송에 실패했습니다.');
  }
};

// 닫기 (3단계)
const handleClose = () => {
  modal.close();
};

// X 버튼 닫기 이벤트를 위해 expose
defineExpose({ step });
</script>

<style lang="scss" scoped>
.find-id {
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

.result-wrap {
  text-align: center;
  padding: 40px 0 20px;
}

.result-text {
  @include font-16-regular;
  color: $white;
  margin-bottom: 40px;
  user-select: text;
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
