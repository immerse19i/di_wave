<template>
  <div class="page_header">
    <div class="logo">
      <img :src="logoSrc" alt="OsteoAge" />
    </div>
    <div class="header-right">
      <span class="timer">{{ timerText }}뒤 로그아웃 됩니다.</span>
      <span class="user-email">{{ userEmail }}님</span>
      <button class="logout-btn" @click="handleLogout">로그아웃</button>
    </div>
  </div>

  <div class="pw-required-page">
    <div class="pw-container">
      <h2 class="page-title">비밀번호 변경</h2>
      <p class="page-desc">
        비밀번호를 변경하신 지 {{ ageDays }}일이 경과되었습니다.<br />
        OsteoAge는 소중한 데이터를 보호하기 위해 정기적인 비밀번호 변경을 권장하고 있습니다.<br />
        비밀번호를 변경해 주세요.
      </p>

      <form class="pw-form" @submit.prevent="handleSubmit">
        <!-- ① 기존 비밀번호 -->
        <div class="form-group">
          <label>기존 비밀번호</label>
          <div class="input-password">
            <input
              :type="showCur ? 'text' : 'password'"
              v-model="form.currentPassword"
              placeholder="새 비밀번호 (영문/숫자/특수문자 조합 8~15)"
            />
            <button
              type="button"
              class="btn-toggle-password"
              @click="showCur = !showCur"
            >
              <img :src="showCur ? eyeShowIcon : eyeHideIcon" alt="토글" />
            </button>
          </div>
          <p v-if="curError" class="validation-text error">
            비밀번호가 일치하지 않습니다.
          </p>
        </div>

        <!-- ② 새 비밀번호 -->
        <div class="form-group">
          <label>새 비밀번호</label>
          <div class="input-password">
            <input
              :type="showNew ? 'text' : 'password'"
              v-model="form.newPassword"
              placeholder="새 비밀번호 (영문/숫자/특수문자 조합 8~15)"
              @input="validateNewPw"
            />
            <button
              type="button"
              class="btn-toggle-password"
              @click="showNew = !showNew"
            >
              <img :src="showNew ? eyeShowIcon : eyeHideIcon" alt="토글" />
            </button>
          </div>
          <p v-if="newPwError" class="validation-text error">
            영문,숫자,특수문자를 조합하여 8~15자 이내로 구성해 주세요.
          </p>
        </div>

        <!-- ③ 새 비밀번호 확인 -->
        <div class="form-group">
          <label>새 비밀번호 확인</label>
          <div class="input-password">
            <input
              :type="showConfirm ? 'text' : 'password'"
              v-model="form.confirmPassword"
              placeholder="새 비밀번호 (영문/숫자/특수문자 조합 8~15)"
              @input="validateConfirm"
            />
            <button
              type="button"
              class="btn-toggle-password"
              @click="showConfirm = !showConfirm"
            >
              <img :src="showConfirm ? eyeShowIcon : eyeHideIcon" alt="토글" />
            </button>
          </div>
          <p v-if="confirmError" class="validation-text error">
            비밀번호가 일치하지 않습니다.
          </p>
        </div>

        <!-- 버튼 -->
        <div class="btn-row">
          <button type="button" class="btn-postpone" @click="handlePostpone">
            90일뒤에 변경하기
          </button>
          <button type="submit" class="btn-save">저장</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authAPI } from '@/api/auth';
import { UseMessageStore } from '@/store/message';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const route = useRoute();
const message = UseMessageStore();
const auth = useAuthStore();

// public 폴더 경로 (Login.vue / Register.vue와 동일 패턴)
const logoSrc = '/assets/logo/logo.svg';
const eyeHideIcon = '/assets/icons/eye_hide.svg';
const eyeShowIcon = '/assets/icons/eye_show.svg';

const ageDays = ref(Number(route.query.days) || 90);
const userEmail = computed(() => auth.user?.email || '');

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const showCur = ref(false);
const showNew = ref(false);
const showConfirm = ref(false);

const curError = ref(false);
const newPwError = ref(false);
const confirmError = ref(false);

// 영문 + 숫자 + 특수문자 조합 8~15자
const pwRegex =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,15}$/;

const validateNewPw = () => {
  newPwError.value =
    form.newPassword !== '' && !pwRegex.test(form.newPassword);
};
const validateConfirm = () => {
  confirmError.value =
    form.confirmPassword !== '' &&
    form.newPassword !== form.confirmPassword;
};

// 저장
const handleSubmit = async () => {
  curError.value = false;
  newPwError.value = !pwRegex.test(form.newPassword);
  confirmError.value = form.newPassword !== form.confirmPassword;

  if (newPwError.value || confirmError.value) return;

  try {
    await authAPI.changePassword(form.currentPassword, form.newPassword);
    message.showAlert('비밀번호가 변경되었습니다.', () => {
      router.push('/main');
    });
  } catch (error) {
    const msg = error.response?.data?.message || '';
    if (msg.includes('현재 비밀번호')) {
      curError.value = true;
    } else {
      message.showAlert(msg || '비밀번호 변경에 실패했습니다.');
    }
  }
};

// 90일뒤에 변경하기
const handlePostpone = async () => {
  try {
    await authAPI.postponePassword();
    router.push('/main');
  } catch (error) {
    message.showAlert('처리 중 오류가 발생했습니다.');
  }
};

// 로그아웃
const handleLogout = async () => {
  try {
    await authAPI.logout();
  } catch (e) {}
  auth.logout();
  router.push('/login');
};

// 자동 로그아웃 타이머 (30분)
const remainSec = ref(30 * 60);
let timerId = null;
const timerText = computed(() => {
  const m = String(Math.floor(remainSec.value / 60)).padStart(2, '0');
  const s = String(remainSec.value % 60).padStart(2, '0');
  return `${m}:${s}초`;
});

onMounted(() => {
  timerId = setInterval(() => {
    remainSec.value--;
    if (remainSec.value <= 0) {
      clearInterval(timerId);
      handleLogout();
    }
  }, 1000);
});
onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>

<style scoped lang="scss">
.page_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  background: $main-color;

  .logo img {
    height: 24px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 24px;
    color: $white;
    @include font-14-regular;
  }

  .logout-btn {
    background: transparent;
    color: $white;
    cursor: pointer;
    @include font-14-regular;
  }
}

.pw-required-page {
  min-height: calc(100vh - 56px);
  display: flex;
  justify-content: center;
  background: $dark-bg;
  padding: 80px 20px 40px;
  box-sizing: border-box;
}

.pw-container {
  width: 100%;
  max-width: 560px;
}

.page-title {
  text-align: center;
  @include font-20-bold;
  color: $white;
  margin-bottom: 16px;
}

.page-desc {
  text-align: center;
  @include font-14-regular;
  color: $dark-text;
  line-height: 1.6;
  margin-bottom: 40px;
}

.pw-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    @include font-14-medium;
    color: $white;
  }
}

.input-password {
  position: relative;
  display: flex;
  align-items: center;

  input {
    width: 100%;
    min-height: 48px;
    padding: 12px 50px 12px 16px;
    background: $dark-input;
    border: 1px solid $dark-line-gray;
    border-radius: $radius-sm;
    color: $white;
    @include font-14-regular;
    box-sizing: border-box;
    outline: none;
    transition: border-color $transition-fast;

    &:focus {
      border-color: $sub-color-2;
    }
    &::placeholder {
      color: $dark-input-gray;
    }
  }

  .btn-toggle-password {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

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

.validation-text.error {
  @include font-12-regular;
  color: $red;
  margin: 0;
}

.btn-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.btn-postpone,
.btn-save {
  min-width: 140px;
  padding: 10px 24px;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;
  transition: background-color $transition-fast, opacity $transition-fast;
}

.btn-postpone {
  background: $dark-line-gray;
  color: $dark-text;

  &:hover {
    opacity: 0.85;
  }
}

.btn-save {
  background: $main-color;
  color: $white;

  &:hover {
    background: $sub-color;
  }
}
</style>
