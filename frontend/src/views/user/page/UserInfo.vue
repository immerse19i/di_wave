<template>
  <div class="user-info-page">
    <Header />
    <div class="user-info-container">
      <!-- 사이드바 -->
      <aside class="sidebar">
        <div class="bar_title">
          설정/계정
        </div>
        <ul class="menu_list">
          <li>
            <router-link to="/user-info/profile">
              <!-- <img src="/assets/icons/profile.svg" alt="" /> -->
              프로필
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/password-change">
              <!-- <img src="/assets/icons/password.svg" alt="" /> -->
              비밀번호 변경
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/notice">
              <!-- <img src="/assets/icons/notice.svg" alt="" /> -->
              공지사항
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/inquiry">
              <!-- <img src="/assets/icons/inquiry.svg" alt="" /> -->
              문의하기
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/credit">
              <!-- <img src="/assets/icons/credit.svg" alt="" /> -->
              크레딧 관리
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/info">
              <!-- <img src="/assets/icons/info.svg" alt="" /> -->
              정보
            </router-link>
          </li>
        </ul>
      </aside>
      
      <!-- 컨텐츠 영역 -->
      <main class="content">
        <div class="content-title">
          {{ pageTitle }}
        </div>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import Header from '@/components/common/Header.vue';
import {computed} from 'vue';
import {useRoute} from 'vue-router';

const route = useRoute();

const pageTitle = computed(()=> {

  const titles = {
        'profile': '프로필',
      'password-change': '비밀번호 변경',
      'notice': '공지사항',
      'inquiry': '문의하기',
      'credit': '크레딧 관리',
      'info': '정보'
  }
  
  /** 
   * @ex user-info/profile -> profile 추출
   * 
   * */ 
    const path = route.path.split('/').pop();
    return titles[path] || "프로필"


})
</script>

<style lang="scss" scoped>
.user-info-page {
  min-height: 100vh;
  background: $dark-bg;
}

.user-info-container {
  display: flex;
  min-height: calc(100vh - 60px);
}

.sidebar {
  width: 240px;
  color:$white;
  // background: $sub-color;
  padding: 42px 56px;
  padding-right:0;
  .bar_title{
    @include font-20-bold;
    margin-bottom:16px;

  }

  .menu_list {
    border-top: 1px solid $white;
    padding-top:16px;
    li a {
      display: flex;
      align-items: center;
      padding: 14.5px 16px;

      color: $white;
      border-radius: $radius-md;
      @include font-16-regular;
      
      &.router-link-active {
        
        @include font-16-bold;
        background: rgba(255, 255, 255, 0.1);
      }
      
      img {
        width: 20px;
        height: 20px;
      }
    }
  }
}

.content {
  flex: 1;
  padding: 24px;
  padding-top:48px;
  .content-title{
    @include font-20-bold;
    color:$white;
    text-align: center;
    margin-bottom:20px;
  }
}
</style>
