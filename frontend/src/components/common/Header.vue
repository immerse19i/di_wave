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
          <button @click="toggleDropdown">
            <img src="/assets/icons/arrow_down.svg" alt="arrow_icon" />
          </button>
          <!-- 드롭다운 -->
          <div class="dropdown_menu" v-if="isDropdownOpen">
            <ul class="menu_list">
              <li>
                <router-link to="/user-info/profile">
                  <img src="/assets/icons/profile.svg" alt="profile_icon">
                  프로필
                </router-link>
              </li>
              <li>
                <router-link to="/user-info/password-change">
                  <img src="/assets/icons/password.svg" alt="password_icon">
                  비밀번호 변경
                </router-link>
              </li>
              <li>
                <router-link to="/user-info/notice">
                  <img src="/assets/icons/notice.svg" alt="notice_icon">
                  공지사항
                </router-link>
              </li>
              <li>
                <router-link to="/user-info/inquiry">
                  <img src="/assets/icons/inquiry.svg" alt="inquiry_icon">
                  문의하기
                </router-link>
              </li>
              <li>
                <router-link to="/user-info/credit">
                  <img src="/assets/icons/credit.svg" alt="credit_icon">
                  크레딧 관리
                </router-link>
              </li>
              <li>
                <router-link to="/user-info/info">
                  <img src="/assets/icons/info.svg" alt="info_icon">
                  정보
                </router-link>
              </li>
            </ul>
          </div>

        </div>
        <button class="log_out" @click="handleLogout">로그아웃</button>
      </div>
    </div>
  </header>
</template>
<script setup>
import { onMounted, ref ,onUnmounted} from 'vue';
import { useRouter } from 'vue-router';
import { authAPI} from '@/api/auth';

const router = useRouter();
const isDropdownOpen = ref(false);

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

// 외부 클릭 시 닫기
const closeDropdown = (e) => {
  if (!e.target.closest('.user_info')) {
    isDropdownOpen.value = false;
  }
}





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
  document.addEventListener('click', closeDropdown);

});

onUnmounted(()=> {
    document.removeEventListener('click', closeDropdown);
})



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
        position:relative;
        height:100%;
      }
      .dropdown_menu{
        position:absolute;
        top:calc(100% + 10px);
        // left:50%;
        right:0;
        // transform:translateX(-50%);
        padding:12px;
        max-width:236px;
        width:236px;
        background:$sub-color;
        border-radius:$radius-md;
        z-index:10;
        li a{
          display:flex;
          align-items:center;
          padding: 8px 24px;
          @include font-13-medium;
          gap:8px;
        }

      }
    }
    .log_out {
      color: $white;
    }
  }
}
</style>
