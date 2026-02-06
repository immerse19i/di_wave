<template>
  <div class="find-password">
    <h2 class="modal-title">비밀번호 찾기</h2>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="userId">ID</label>
        <input
          type="text"
          id="userId"
          v-model="form.userId"
          placeholder="가입시 입력한 ID를 입력해 주세요"
        />
      </div>

      <div class="form-group">
        <label for="email">이메일</label>
        <input
          type="email"
          id="email"
          v-model="form.email"
          placeholder="가입시 입력한 이메일 주소르르 입력해 주세요"
        />
      </div>

      <button type="submit" class="btn-submit">다음</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useModalStore } from '@/store/modal';

const modal = useModalStore();

const form = ref({
  userId: '',
  email: '',
});

const handleSubmit = () => {
  // TODO: API 연동
  console.log('Find Password:', form.value);
};
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
}
</style>
