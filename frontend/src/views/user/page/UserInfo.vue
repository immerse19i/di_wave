<template>
  <div class="user-info-page">
    <Header />
    <div class="user-info-container">
      <!-- 사이드바 -->
      <aside class="sidebar">
        <ul class="menu_list">
          <li>
            <router-link to="/user-info/profile">
              <img src="/assets/icons/profile.svg" alt="" />
              프로필
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/password-change">
              <img src="/assets/icons/password.svg" alt="" />
              비밀번호 변경
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/notice">
              <img src="/assets/icons/notice.svg" alt="" />
              공지사항
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/inquiry">
              <img src="/assets/icons/inquiry.svg" alt="" />
              문의하기
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/credit">
              <img src="/assets/icons/credit.svg" alt="" />
              크레딧 관리
            </router-link>
          </li>
          <li>
            <router-link to="/user-info/info">
              <img src="/assets/icons/info.svg" alt="" />
              정보
            </router-link>
          </li>
        </ul>
      </aside>
      
      <!-- 컨텐츠 영역 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import Header from '@/components/common/Header.vue';
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
  background: $sub-color;
  padding: 24px 12px;
  
  .menu_list {
    li a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      color: $white;
      border-radius: $radius-md;
      @include font-14-medium;
      
      &:hover, &.router-link-active {
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
}
</style>
