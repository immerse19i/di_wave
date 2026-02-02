<template>
  <header id="header">
    <div class="header_inner">
      <div class="logo">
        <img src="/assets/logo/logo.svg" alt="logo" />
      </div>
      <div class="right_menu">
        <div class="time_text">{{}}</div>
        <div class="user_info">
          {{ logUserId }}님
          <button>
            <img src="/assets/icons/arrow_down.svg" alt="" />
          </button>
        </div>
        <button class="log_out" @click="handleLogout">로그아웃</button>
      </div>
    </div>
  </header>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import {useRouter} from 'vue-router';
import { authAPI} from '@/api/auth';

const router = useRouter();


const demoId = '테스트';


const isConnect = ref(false);
const logUserId = ref(null);

const handleLogout = async () => {
  try{
    await authAPI.logout();

  } catch(e){
    //에러 무시
  }
  localStorage.removeItem('token');
    router.push('/login');
}



onMounted(() => {
  setData();
});

const setData = () => {
  if (isConnect.value) {
  } else {
    logUserId.value = demoId;
  }
};
</script>

<style lang="scss" scoped>
#header {
  background: $main-gad;
  color: $white;

  .header_inner {
    padding: 12px 20px;
    min-height: 60px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    @include font-14-medium;
    .logo {
      max-width: 93px;
      img {
        width: 100%;
      }
    }

    .right_menu {
      display: flex;
      gap: 20px;

      .user_info {
        display: flex;
        gap: 8px;
      }
    }
    .log_out {
      color: $white;
    }
  }
}
</style>
