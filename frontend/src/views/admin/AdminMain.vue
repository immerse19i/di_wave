<template>
  <div class="admin-layout">
    <!-- 헤더 -->
    <header class="admin-header">
      <div
        class="header-left"
        @click="$router.push('/admin')"
        style="cursor: pointer"
      >
        <img src="/assets/logo/logo.svg" alt="OsteoAge" class="header-logo" />
        <span class="header-title">관리자웹</span>
      </div>
      <div class="header-right">
        <span>{{ userName }}님</span>
        <button class="btn-logout" @click="handleLogout">로그아웃</button>
      </div>
    </header>

    <div class="admin-body">
      <!-- 사이드바 -->
      <aside class="admin-sidebar">
        <nav>
          <a
            v-for="menu in menuList"
            :key="menu.path"
            class="menu-item"
            :class="{ active: isActiveMenu(menu.path) }"
            @click="handleMenuClick(menu.path)"
          >
            <img :src="menu.icon" :alt="menu.label" />
            <span>{{ menu.label }}</span>
          </a>
        </nav>
      </aside>

      <!-- 콘텐츠 -->
      <main class="admin-content">
        <router-view :key="$route.fullPath" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { authAPI } from '@/api/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const userName = computed(() => auth.user?.login_id || 'admin');

const menuList = [
  {
    label: '승인관리',
    path: '/admin/approval',
    icon: '/assets/icons/approval.svg',
  },
  {
    label: '가입계정목록',
    path: '/admin/accounts',
    icon: '/assets/icons/profile.svg',
  },
  {
    label: '공지사항',
    path: '/admin/notices',
    icon: '/assets/icons/notice.svg',
  },
  {
    label: '고객문의관리',
    path: '/admin/inquiries',
    icon: '/assets/icons/inquiry.svg',
  },
  {
    label: '안내팝업',
    path: '/admin/popups',
    icon: '/assets/icons/notice.svg',
  },
  {
    label: '이용약관',
    path: '/admin/terms',
    icon: '/assets/icons/terms_icon.svg',
  },
  { label: '정보 수정', path: '/admin/info', icon: '/assets/icons/info.svg' },
  {
    label: '사용기록',
    path: '/admin/logs',
    icon: '/assets/icons/usage_log_icon.svg',
  },
  {
    label: '권한',
    path: '/admin/permissions',
    icon: '/assets/icons/permission_icon.svg',
  },
];

const isActiveMenu = (path) => {
  return route.path.startsWith(path);
};

const handleLogout = async () => {
  try {
    await authAPI.logout();
  } catch (e) {
    // 에러 무시
  }
  localStorage.removeItem('token');
  router.push('/admin/login');
};

const handleMenuClick = (path) => {
  if (route.path === path) {
    // 같은 메뉴 재클릭 → 타임스탬프 쿼리로 강제 리로드
    router.replace({ path, query: { t: Date.now() } });
  } else {
    router.push(path);
  }
};
</script>

<style lang="scss" scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: $dark-bg;
}

// 헤더
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  min-height: 60px;
  background: $main-gad;
  color: $white;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .header-logo {
      height: 24px;
    }

    .header-title {
      @include font-16-bold;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
    @include font-14-medium;

    .btn-logout {
      color: $white;
      background: none;
      border: none;
      cursor: pointer;
    }
  }
}

// 바디
.admin-body {
  display: flex;
  flex: 1;
}

// 사이드바
.admin-sidebar {
  width: 212px;
  min-width: 212px;
  background: $dark-black;
  padding: 0px 0;

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    color: $dark-gray-light;
    @include font-14-medium;
    text-decoration: none;
    transition: all $transition-fast;

    img {
      width: 24px;
      height: 24px;
      opacity: 1;
    }

    &:hover {
      color: $white;
      background: rgba(255, 255, 255, 0.05);
    }

    &.active {
      color: $white;
      background: #27313f;

      img {
        opacity: 1;
      }
    }
  }
}

// 콘텐츠
.admin-content {
  flex: 1;
  overflow-y: auto;
}
</style>
