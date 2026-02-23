<template>
  <div class="admin-login-page">
    <div class="login-container">
      <h1 class="login-title">DI-WAVE</h1>
      <p class="login-subtitle">관리자 로그인</p>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="adminId">관리자 아이디</label>
          <input
            type="text"
            id="adminId"
            v-model="form.adminId"
            placeholder="아이디를 입력하세요"
          />
        </div>

        <div class="form-group">
          <label for="password">비밀번호</label>
          <input
            type="password"
            id="password"
            v-model="form.password"
            placeholder="비밀번호를 입력하세요"
          />
        </div>

<p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
<button type="submit" class="btn-login">로그인</button>
      </form>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { authAPI } from '@/api/auth'

const router = useRouter()
const auth = useAuthStore()

const form = ref({
  adminId: '',
  password: ''
})

const errorMessage = ref('')

const handleLogin = async () => {
  try {
    errorMessage.value = ''
    const { data } = await authAPI.login(form.value.adminId, form.value.password)
    
    // 관리자 권한 체크
    if (data.user.role !== 'admin') {
      errorMessage.value = '관리자 권한이 없습니다.'
      return
    }
    
    // 토큰 저장
    auth.setToken(data.token)
    
    // 유저 정보 조회
    const { data: userData } = await authAPI.getMe()
    auth.setUser(userData)
    
    // 관리자 대시보드로 이동
    router.push('/admin/dashboard')
  } catch (error) {
    if (error.response?.status === 423) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = '아이디 또는 비밀번호가 올바르지 않습니다.'
    }
  }
}
</script>


<style lang="scss" scoped>
.admin-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $dark-bg;
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: $spacing-xl;
  background-color: $white;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
}

.login-title {
  @include font-32-bold;
  color: $main-color;
  text-align: center;
  margin-bottom: $spacing-xs;
}

.login-subtitle {
  @include font-14-medium;
  color: $dark-gray-dark;
  text-align: center;
  margin-bottom: $spacing-xl;
}

.login-form {
  .form-group {
    margin-bottom: $spacing-md;

    label {
      display: block;
      @include font-12-regular;
      color: $dark-gray-dark;
      margin-bottom: $spacing-xs;
    }

    input {
      width: 100%;
      padding: $spacing-sm $spacing-md;
      border: 1px solid $dark-gray;
      border-radius: $radius-md;
      @include font-14-regular;
      transition: border-color $transition-fast;

      &::placeholder {
        color: $dark-line-gray;
      }

      &:focus {
        border-color: $main-color;
      }
    }
  }
}

.btn-login {
  width: 100%;
  padding: $spacing-md;
  background-color: $dark-bg;
  color: $white;
  border-radius: $radius-md;
  @include font-16-bold;
  transition: background-color $transition-fast;
  margin-top: $spacing-md;

  &:hover {
    background-color: $dark-gray-dark;
  }
}

.error-message {
  @include font-12-regular;
  color: red;
  margin-bottom: $spacing-sm;
}

</style>
