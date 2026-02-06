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

        <p :class="isPasswordWrong ? 'validation-alert show' : 'validation-alert'">
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
  <LoginFooter/>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useModalStore } from '@/store/modal';
import UserModalBody from '@/components/user_modal/UserModalBody.vue';
import { UseMessageStore } from '@/store/message';
import {authAPI} from '@/api/auth';
import LoginFooter from '../../components/common/LoginFooter.vue';

const modal = useModalStore();
const router = useRouter();
const message = UseMessageStore();

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
    const {data}= await authAPI.login(form.value.userId, form.value.password);

    //토큰 저장
    localStorage.setItem('token', data.token);
    //메인페이지로 이동
    router.push('/main');

  } catch(error){

    
      // console.log('Login error:', error.response?.data);
    // message.show('아이디 또는 비밀번호가 일치하지 않습니다.', 3000);
    isPasswordWrong.value = true;
  }
}


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

  &.show{
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
