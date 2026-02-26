<template>
  <div class="password-change">
    <!-- Step 1: 기존 비밀번호 확인 -->
    <div v-if="step === 1" class="step-wrap">
      <label class="field-label">기존 비밀번호</label>
      <input
        type="password"
        v-model="currentPassword"
        placeholder="기존 비밀번호 입력"
        @keyup.enter="handleNext"
      />
      <div class="btn-wrap">
        <button class="btn-submit" @click="handleNext">다음</button>
      </div>
    </div>

    <!-- Step 2: 새 비밀번호 입력 -->
    <div v-if="step === 2" class="step-wrap">
      <label class="field-label">새 비밀번호</label>
      <input
        type="password"
        v-model="newPassword"
        placeholder="새 비밀번호 (영문/숫자/특수문자 조합 8~15)"
        @input="validatePassword"
      />
      <p v-if="newPassword && !isPasswordValid" class="error-msg">
        영문/숫자/특수문자 조합 8~15자 이내로 입력 해주세요.
      </p>

      <label class="field-label">새 비밀번호 확인</label>
      <input
        type="password"
        v-model="confirmPassword"
        placeholder="비밀번호 재입력"
        @keyup.enter="handleChange"
      />
      <p v-if="confirmPassword && !isConfirmMatch" class="error-msg">
        비밀번호가 일치하지 않습니다.
      </p>

      <div class="btn-wrap">
        <button
          class="btn-submit"
          :class="{ disabled: !canSubmit }"
          @click="handleChange"
        >
          변경
        </button>
      </div>
    </div>

    <!-- 모달 -->
    <div class="modal-overlay" v-if="modalVisible">
      <div class="modal-box">
        <p>{{ modalMessage }}</p>
        <button class="btn-confirm" @click="handleModalClose">확인</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { authAPI } from '@/api/auth';

const router = useRouter();

const step = ref(1);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const modalVisible = ref(false);
const modalMessage = ref('');
const modalType = ref(''); // 'error' | 'success'

// 비밀번호 유효성: 영문 + 숫자 + 특수문자 조합 8~15자
const passwordRegex =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,15}$/;

const isPasswordValid = computed(() => passwordRegex.test(newPassword.value));
const isConfirmMatch = computed(
  () => newPassword.value === confirmPassword.value,
);
const canSubmit = computed(() => isPasswordValid.value && isConfirmMatch.value);

const validatePassword = () => {};

const showModal = (message, type = 'error') => {
  modalMessage.value = message;
  modalType.value = type;
  modalVisible.value = true;
};

const handleModalClose = () => {
  modalVisible.value = false;
  if (modalType.value === 'success') {
    router.push('/user-info/profile');
  }
};

// Step 1: 기존 비밀번호 확인
const handleNext = async () => {
  if (!currentPassword.value) return;
  try {
    await authAPI.verifyPassword(currentPassword.value);
    step.value = 2;
  } catch (error) {
    showModal('비밀번호가 일치하지 않습니다.');
  }
};

// Step 2: 비밀번호 변경
const handleChange = async () => {
  if (!canSubmit.value) return;
  try {
    await authAPI.changePassword(currentPassword.value, newPassword.value);
    showModal('비밀번호가 변경되었습니다.', 'success');
  } catch (error) {
    showModal(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
  }
};
</script>

<style scoped lang="scss">
@import '@/assets/scss/variables';

.password-change {
  max-width: 720px;
  margin: 0 auto;
  padding-top: 20px;
}

.step-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  @include font-14-regular;
  color: $dark-text;
}

input[type='password'] {
  width: 100%;
  padding: 12px 16px;
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  box-sizing: border-box;
  outline: none;
  transition: border-color $transition-fast;

  &:focus {
    border-color: $main-color;
  }

  &::placeholder {
    color: $dark-input-gray;
  }
}

.error-msg {
  @include font-12-regular;
  color: #e74c3c;
  margin-top: -4px;
}

.btn-wrap {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.btn-submit {
  padding: 12px 60px;
  background: $main-gad;
  color: $white;
  @include font-14-bold;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: opacity $transition-fast;

  &:hover {
    opacity: 0.9;
  }

  &.disabled {
    background: $dark-line-gray;
    color: $dark-text;
    cursor: not-allowed;

    &:hover {
      opacity: 1;
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box {
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-lg;
  padding: 40px;
  max-width: 480px;
  width: 90%;
  text-align: center;
  color: $white;

  p {
    @include font-14-regular;
    margin-bottom: 24px;
  }

  .btn-confirm {
    padding: 10px 60px;
    background: $main-color;
    color: $white;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
    transition: background $transition-fast;

    &:hover {
      background: $sub-color;
    }
  }
}
</style>
