<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-logo">
        <img :src="logoSrc" alt="OsteoAge" />
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <input
            type="text"
            id="userId"
            v-model="form.userId"
            placeholder="ID"
          />
        </div>

        <div class="form-group">
          <div class="input-password">
            <input
              :type="showPassword ? 'text' : 'password'"
              id="password"
              v-model="form.password"
              placeholder="비밀번호"
            />
            <button
              type="button"
              class="btn-toggle-password"
              @click="showPassword = !showPassword"
            >
              <img
                :src="showPassword ? eyeShowIcon : eyeHideIcon"
                alt="비밀번호 표시"
              />
            </button>
          </div>
        </div>

        <p
          :class="
            isPasswordWrong ? 'validation-alert show' : 'validation-alert'
          "
        >
          아이디 또는 비밀번호가 일치하지 않습니다.
        </p>
        <button type="submit" class="btn-login">로그인</button>
      </form>

      <div class="login-options">
        <div class="login-links">
          <label class="checkbox-wrapper">
            <input type="checkbox" v-model="rememberUserId" />
            <span class="checkmark"></span>
            <span class="label-text">아이디저장</span>
          </label>
          <a @click="router.push('/register')">회원가입</a>
          <a @click="modal.open('find_id', 'sign')">ID찾기</a>
          <a @click="modal.open('find_password', 'sign')">비밀번호찾기</a>
        </div>
      </div>

      <div class="login-copyright">
        Copyright © DiWAVE Inc. 2023 All Right Reserved
      </div>
    </div>
    <UserModalBody v-if="modal.isOpen && modal.role === 'sign'" />
  </div>
  <LoginFooter />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useModalStore } from '@/store/modal';
import UserModalBody from '@/components/user_modal/UserModalBody.vue';
import { UseMessageStore } from '@/store/message';
import { authAPI } from '@/api/auth';
import LoginFooter from '../../components/common/LoginFooter.vue';
import { useAuthStore } from '@/store/auth';
import { creditAPI } from '@/api/credit';
const modal = useModalStore();
const router = useRouter();
const route = useRoute();
const message = UseMessageStore();
const auth = useAuthStore();
const form = ref({
  userId: '',
  password: '',
});

const showPassword = ref(false);
const rememberUserId = ref(false);
const isPasswordWrong = ref(false);

// public 폴더 경로
const logoSrc = '/assets/logo/logo.svg';
const eyeHideIcon = '/assets/icons/eye_hide.svg';
const eyeShowIcon = '/assets/icons/eye_show.svg';

// const handleLogin = () => {
//   // TODO: API 연동
//   console.log('Login:', form.value);
//   // 데모: 바로 대시보드로 이동
//   router.push('/main');

//   // message.show('아이디 또는 비밀번호가 일치하지 않습니다.', 30);
// };

const handleLogin = async () => {
  try {
    isPasswordWrong.value = false;
    const { data } = await authAPI.login(
      form.value.userId,
      form.value.password,
    );

    if (data.user.role === 'admin') {
      isPasswordWrong.value = true;
      return;
    }

    auth.setToken(data.token);
    const { data: userData } = await authAPI.getMe();
    auth.setUser(userData);

    // 만료 크레딧 자동 처리
    try {
      await creditAPI.expireCheck();
    } catch (e) {}

    // 관리자 지급 알림 체크
    try {
      const { data: grantRes } = await creditAPI.getUnnotifiedGrants();
      if (grantRes.data && grantRes.data.length > 0) {
        const totalAmount = grantRes.data.reduce((sum, g) => sum + g.amount, 0);
        await new Promise((resolve) => {
          message.showAlert(
            `크레딧이 ${totalAmount}개 지급 되었습니다.\n유효기간은 지급일로부터 30일이며, 만료 후에는 자동 소멸됩니다.\n해당 크레딧은 서비스성 크레딧으로,\n환불 및 현금 전환이 불가하오니 이용에 유의하시기 바랍니다.`,
            resolve,
          );
        });
        try {
          await creditAPI.markNotified();
        } catch (e) {}
      }
    } catch (e) {}

    // 만료 예정 크레딧 팝업 (일주일 보지 않기 체크)
    try {
      let skipExpiring = false;
      const dismissed = localStorage.getItem('creditExpiryDismissed');
      if (dismissed) {
        const { dismissedAt } = JSON.parse(dismissed);
        if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000)
          skipExpiring = true;
      }

      if (!skipExpiring) {
        const { data: expiringRes } = await creditAPI.getExpiring();
        if (expiringRes.data && expiringRes.data.length > 0) {
          for (const batch of expiringRes.data) {
            const dateStr = new Date(batch.expires_at).toLocaleDateString(
              'ko-KR',
            );
            await new Promise((resolve) => {
              message.showConfirm(
                `${dateStr} 만료 예정인 크레딧이 ${batch.remaining_amount}개 있습니다.`,
                resolve,
                () => {
                  localStorage.setItem(
                    'creditExpiryDismissed',
                    JSON.stringify({ dismissedAt: Date.now() }),
                  );
                  resolve();
                },
              );
            });
            // 일주일 보지 않기 선택했으면 나머지 팝업 스킵
            const rechk = localStorage.getItem('creditExpiryDismissed');
            if (rechk) break;
          }
        }
      }
    } catch (e) {}

    // 아이디 저장 처리
    if (rememberUserId.value) {
      localStorage.setItem('savedUserId', form.value.userId);
    } else {
      localStorage.removeItem('savedUserId');
    }

    router.push('/main');
  } catch (error) {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if (status === 423) {
      message.showAlert(error.response?.data?.message);
      return;
    } else if (code === 'PENDING_APPROVAL') {
      message.showAlert(
        '아직 가입 승인 대기 중입니다.\n승인 완료 후 이메일로 안내해 드립니다.',
      );
    } else if (code === 'REJECTED') {
      const rejectedToken = error.response?.data?.token;
      if (rejectedToken) {
        localStorage.setItem('token', rejectedToken);
      }
      message.showAlert(
        '가입이 반려되었습니다.\n사유 확인 후 재신청이 가능합니다.',
        () => router.push('/reapply'),
      );
    } else if (code === 'SUSPENDED') {
      message.showAlert('정지된 계정입니다.\n관리자에게 문의해 주세요.');
      return;
    } else {
      isPasswordWrong.value = true;
    }
  }
};

// 세션 만료 팝업
onMounted(() => {
  // 저장된 아이디 불러오기
  const savedId = localStorage.getItem('savedUserId');
  if (savedId) {
    form.value.userId = savedId;
    rememberUserId.value = true;
  }

  if (route.query.expired === 'true') {
    message.showAlert(
      '보안을 위해 일정 시간 동안 움직임이 없어 자동 로그아웃되었습니다.\n다시 로그인해 주세요.',
    );
    router.replace({ query: {} });
  }
});
</script>

<style lang="scss" scoped>
.login-page {
  min-height: calc(100vh - 157px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: $dark-bg;
}

.login-container {
  // flex:1;
  width: 100%;
  max-width: 398px;
  padding: $spacing-xl;
}

.login-logo {
  text-align: center;
  margin-bottom: 56px;

  img {
    height: 48px;
    margin: auto;
  }
}

.login-form {
  .form-group {
    margin-bottom: $spacing-md;
    &:last-child {
      margin-bottom: 0;
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
      transition: background-color $transition-fast;

      &::placeholder {
        color: $dark-input-gray;
      }

      &:focus {
        border: 1px solid $sub-color-2;
        // background-color: lighten($dark-gray-dark, 5%);
      }
    }
  }

  .input-password {
    position: relative;

    input {
      padding-right: 50px;
    }

    .btn-toggle-password {
      position: absolute;
      right: $spacing-md;
      top: 50%;
      transform: translateY(-50%);
      padding: $spacing-xs;
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
}
.validation-alert {
  @include font-12-regular;
  visibility: hidden;
  color: $red;

  &.show {
    visibility: visible;
  }
}
.btn-login {
  width: 100%;
  padding: $spacing-md;
  background-color: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  transition: background-color $transition-fast;
  margin-top: $spacing-md;

  &:hover {
    background-color: $sub-color;
  }
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing-lg;

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    cursor: pointer;
    padding-left: 18px;
    position: relative;
    input[type='checkbox'] {
      accent-color: $main-color;
      cursor: pointer;
      display: none;
    }

    &::after {
      content: '';
      width: 18px;
      height: 18px;
      border: 1px solid $main-color;
      border-radius: $radius-sm;
      position: absolute;
      left: 0;
    }

    &:has(input[type='checkbox']:checked)::after {
      background: url(/assets/icons/check.svg) no-repeat center / 12px;
      background-color: $main-color;
    }

    .label-text {
      @include font-14-regular;
      color: $white;
    }
  }

  .login-links {
    display: flex;
    // gap: $spacing-lg;
    justify-content: space-between;
    width: 100%;
    a {
      @include font-14-regular;
      color: $white;
      cursor: pointer;
      transition: color $transition-fast;

      &:hover {
        color: $white;
      }
    }
  }
}

.login-copyright {
  @include font-12-regular;
  color: $gray;
  text-align: left;
  margin-top: $spacing-xxl;
}
</style>
